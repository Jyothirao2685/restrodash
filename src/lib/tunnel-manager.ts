import { bin, Tunnel } from 'cloudflared';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface TunnelState {
  status: 'stopped' | 'starting' | 'active' | 'rotating' | 'error';
  mode: 'quick' | 'token';
  url: string | null;
  domain: string | null;
  hasTokenConfigured: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  expiresInMinutes: number;
  rotationIntervalHours: number;
  rotationCount: number;
  error: string | null;
  shiftKillswitch: {
    enabled: boolean;
    closeHour: number; // e.g. 23 (11 PM)
    openHour: number;  // e.g. 7 (7 AM)
  };
  metrics: {
    totalRotations: number;
    lastRotationAt: string | null;
    uptimeSeconds: number;
  };
}

export interface TunnelConfig {
  mode: 'quick' | 'token';
  token?: string;
  domain?: string;
  rotationIntervalHours?: number;
  shiftKillswitch?: {
    enabled: boolean;
    closeHour: number;
    openHour: number;
  };
}

class TunnelManager {
  private activeTunnel: any = null; // Either cloudflared Tunnel instance or ChildProcess
  private activeMode: 'quick' | 'token' = 'token';
  private token: string | null = null;
  private configuredDomain: string | null = null;
  private currentUrl: string | null = null;
  private status: TunnelState['status'] = 'stopped';
  private startedAt: number | null = null;
  private expiresAt: number | null = null;
  private rotationIntervalHours: number = 8;
  private rotationCount: number = 0;
  private lastError: string | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private nightCheckInterval: NodeJS.Timeout | null = null;
  private uptimeInterval: NodeJS.Timeout | null = null;
  private totalUptimeSeconds: number = 0;
  private lastRotationAt: string | null = null;

  private shiftKillswitch = {
    enabled: true,
    closeHour: 23,
    openHour: 7,
  };

  constructor() {
    this.loadSavedConfig();
    this.setupProcessCleanup();
    this.startNightWatch();
  }

  private get configFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Fallback
      }
    }
    return path.join(dataDir, 'tunnel-config.json');
  }

  private loadSavedConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        const config: TunnelConfig = JSON.parse(raw);
        if (config.mode) this.activeMode = config.mode;
        if (config.token) this.token = config.token;
        if (config.domain) this.configuredDomain = config.domain;
        if (config.rotationIntervalHours) this.rotationIntervalHours = config.rotationIntervalHours;
        if (config.shiftKillswitch) this.shiftKillswitch = { ...this.shiftKillswitch, ...config.shiftKillswitch };
      }
    } catch {
      // Ignore load error
    }
  }

  private persistConfig() {
    try {
      const config: TunnelConfig = {
        mode: this.activeMode,
        token: this.token || undefined,
        domain: this.configuredDomain || undefined,
        rotationIntervalHours: this.rotationIntervalHours,
        shiftKillswitch: this.shiftKillswitch,
      };
      fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    } catch {
      // Ignore write error
    }
  }

  private isNightTime(): boolean {
    if (!this.shiftKillswitch.enabled) return false;
    const currentHour = new Date().getHours();
    if (this.shiftKillswitch.closeHour > this.shiftKillswitch.openHour) {
      return currentHour >= this.shiftKillswitch.closeHour || currentHour < this.shiftKillswitch.openHour;
    }
    return currentHour >= this.shiftKillswitch.closeHour && currentHour < this.shiftKillswitch.openHour;
  }

  private startNightWatch() {
    if (this.nightCheckInterval) clearInterval(this.nightCheckInterval);
    this.nightCheckInterval = setInterval(() => {
      if (this.isNightTime() && this.status === 'active') {
        console.log('[TunnelManager] Night mode activated: Shift closed. Shutting down tunnel for computer security.');
        this.stop('Shift hours ended (Night Mode Killswitch)');
      }
    }, 5 * 60 * 1000);
  }

  private setupProcessCleanup() {
    const cleanup = () => {
      if (this.activeTunnel) {
        try {
          if (typeof this.activeTunnel.kill === 'function') {
            this.activeTunnel.kill('SIGINT');
          } else if (typeof this.activeTunnel.stop === 'function') {
            this.activeTunnel.stop();
          } else if (typeof this.activeTunnel._stop === 'function') {
            this.activeTunnel._stop();
          }
        } catch {
          // Process exiting
        }
      }
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('exit', cleanup);
  }

  /**
   * Starts a permanent Cloudflare Named Tunnel using a Token
   */
  public async startWithToken(token: string, domain: string): Promise<string> {
    const cleanDomain = domain.trim().startsWith('http')
      ? domain.trim()
      : `https://${domain.trim()}`;

    this.activeMode = 'token';
    this.token = token.trim();
    this.configuredDomain = cleanDomain;
    this.currentUrl = cleanDomain;
    this.persistConfig();

    return this.start();
  }

  /**
   * Starts the tunnel based on current configuration
   */
  public async start(targetPort: number = Number(process.env.PORT) || 3000): Promise<string> {
    if (this.isNightTime()) {
      const msg = `Tunnel start blocked by Night Mode (Closed between ${this.shiftKillswitch.closeHour}:00 and ${this.shiftKillswitch.openHour}:00).`;
      console.warn(`[TunnelManager] ${msg}`);
      this.status = 'stopped';
      this.lastError = msg;
      throw new Error(msg);
    }

    if (this.status === 'active' && this.currentUrl && this.activeTunnel) {
      return this.currentUrl;
    }

    // Mode 1: Permanent Named Tunnel with Token
    if (this.activeMode === 'token' && this.token) {
      return this.spawnNamedTunnel(this.token, this.configuredDomain || `http://localhost:${targetPort}`);
    }

    // Mode 2: Quick Ephemeral Tunnel
    return this.spawnQuickTunnel(targetPort);
  }

  private async spawnNamedTunnel(token: string, domain: string): Promise<string> {
    this.stop('Restarting in token mode');
    this.status = 'starting';
    this.lastError = null;

    return new Promise<string>((resolve, reject) => {
      try {
        console.log('[TunnelManager] Spawning permanent Cloudflare Named Tunnel with token...');
        const child: ChildProcess = spawn(bin, ['tunnel', 'run', '--token', token], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        this.activeTunnel = child;

        let resolved = false;
        const startupTimeout = setTimeout(() => {
          if (!resolved && this.status === 'starting') {
            // Assume connected if process is still running after 4 seconds
            resolved = true;
            this.status = 'active';
            this.currentUrl = domain;
            this.startedAt = Date.now();
            this.expiresAt = null; // Permanent tunnel: does not expire
            this.startUptimeTracker();
            console.log(`[TunnelManager] Permanent Named Tunnel LIVE at: ${this.currentUrl}`);
            resolve(domain);
          }
        }, 4000);

        child.stdout?.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('Registered tunnel connection') || str.includes('Connection') && !resolved) {
            clearTimeout(startupTimeout);
            resolved = true;
            this.status = 'active';
            this.currentUrl = domain;
            this.startedAt = Date.now();
            this.expiresAt = null;
            this.startUptimeTracker();
            console.log(`[TunnelManager] Permanent Named Tunnel LIVE: ${domain}`);
            resolve(domain);
          }
        });

        child.stderr?.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('Registered tunnel connection') || (str.includes('Connected to') && !resolved)) {
            clearTimeout(startupTimeout);
            resolved = true;
            this.status = 'active';
            this.currentUrl = domain;
            this.startedAt = Date.now();
            this.expiresAt = null;
            this.startUptimeTracker();
            console.log(`[TunnelManager] Permanent Named Tunnel connection established: ${domain}`);
            resolve(domain);
          }
          if (str.includes('Cannot determine default origin certificate') || str.includes('error=')) {
            this.lastError = str.slice(0, 300);
          }
        });

        child.on('error', (err) => {
          clearTimeout(startupTimeout);
          this.status = 'error';
          this.lastError = err.message;
          reject(err);
        });

        child.on('exit', (code) => {
          clearTimeout(startupTimeout);
          console.log(`[TunnelManager] Permanent tunnel process exited with code ${code}`);
          if (this.status === 'starting' && !resolved) {
            this.status = 'error';
            this.lastError = `Tunnel exited immediately with code ${code}. Please verify your Cloudflare Tunnel Token.`;
            reject(new Error(this.lastError));
          } else {
            this.status = 'stopped';
            this.currentUrl = null;
          }
        });
      } catch (err: any) {
        this.status = 'error';
        this.lastError = err.message;
        reject(err);
      }
    });
  }

  private async spawnQuickTunnel(targetPort: number): Promise<string> {
    this.status = 'starting';
    this.lastError = null;

    return new Promise<string>((resolve, reject) => {
      try {
        const targetUrl = `http://localhost:${targetPort}`;
        console.log(`[TunnelManager] Initializing Cloudflare Quick Tunnel to ${targetUrl}...`);

        const tunnel = Tunnel.quick(targetUrl);
        this.activeTunnel = tunnel;

        const timeout = setTimeout(() => {
          if (this.status === 'starting') {
            this.status = 'error';
            this.lastError = 'Quick tunnel connection timed out after 20 seconds.';
            this.stop('Timeout');
            reject(new Error(this.lastError));
          }
        }, 20000);

        tunnel.once('url', (emittedUrl: string) => {
          clearTimeout(timeout);
          this.currentUrl = emittedUrl;
          this.status = 'active';
          this.startedAt = Date.now();
          this.lastError = null;

          const lifetimeMs = this.rotationIntervalHours * 60 * 60 * 1000;
          this.expiresAt = this.startedAt + lifetimeMs;

          console.log(`[TunnelManager] Quick Tunnel LIVE: ${this.currentUrl}`);
          this.scheduleRotation();
          this.startUptimeTracker();
          resolve(emittedUrl);
        });

        tunnel.on('error', (err: any) => {
          this.lastError = err?.message || String(err);
          this.status = 'error';
        });

        tunnel.on('exit', (code: number | null) => {
          console.log(`[TunnelManager] Quick tunnel exited with code ${code}`);
          if (this.status === 'active') {
            this.status = 'stopped';
            this.currentUrl = null;
          }
        });
      } catch (err: any) {
        this.status = 'error';
        this.lastError = err?.message || 'Failed to spawn quick tunnel';
        reject(err);
      }
    });
  }

  public stop(reason: string = 'User stopped') {
    console.log(`[TunnelManager] Stopping tunnel. Reason: ${reason}`);
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }

    if (this.activeTunnel) {
      try {
        if (typeof this.activeTunnel.kill === 'function') {
          this.activeTunnel.kill('SIGINT');
        } else if (typeof this.activeTunnel.stop === 'function') {
          this.activeTunnel.stop();
        } else if (typeof this.activeTunnel._stop === 'function') {
          this.activeTunnel._stop();
        }
      } catch {
        // Fallback
      }
      this.activeTunnel = null;
    }

    this.status = 'stopped';
    this.currentUrl = null;
    this.startedAt = null;
    this.expiresAt = null;
  }

  public async rotate(targetPort: number = Number(process.env.PORT) || 3000): Promise<string> {
    if (this.activeMode === 'token') {
      console.log('[TunnelManager] Permanent Named Tunnel does not rotate domains. Restarting connection...');
      this.stop('Restarting permanent tunnel');
      await new Promise((r) => setTimeout(r, 1000));
      return this.start(targetPort);
    }

    console.log('[TunnelManager] Rotating quick tunnel URL...');
    this.status = 'rotating';
    this.stop('Rotating URL');
    await new Promise((r) => setTimeout(r, 1200));
    this.rotationCount++;
    this.lastRotationAt = new Date().toISOString();
    return this.start(targetPort);
  }

  private scheduleRotation() {
    if (this.activeMode === 'token') return; // Permanent tunnels do not expire
    if (this.rotationTimer) clearTimeout(this.rotationTimer);

    const lifetimeMs = this.rotationIntervalHours * 60 * 60 * 1000;
    this.rotationTimer = setTimeout(async () => {
      try {
        await this.rotate();
      } catch (err) {
        console.error('[TunnelManager] Auto-rotation failed:', err);
      }
    }, lifetimeMs);
  }

  private startUptimeTracker() {
    if (this.uptimeInterval) clearInterval(this.uptimeInterval);
    this.uptimeInterval = setInterval(() => {
      if (this.status === 'active') {
        this.totalUptimeSeconds += 10;
      }
    }, 10000);
  }

  public configure(options: {
    mode?: 'quick' | 'token';
    token?: string;
    domain?: string;
    rotationIntervalHours?: number;
    shiftKillswitch?: { enabled: boolean; closeHour: number; openHour: number };
  }) {
    if (options.mode) this.activeMode = options.mode;
    if (options.token !== undefined) this.token = options.token.trim() || null;
    if (options.domain !== undefined) {
      const d = options.domain.trim();
      this.configuredDomain = d ? (d.startsWith('http') ? d : `https://${d}`) : null;
    }
    if (options.rotationIntervalHours !== undefined) {
      this.rotationIntervalHours = Math.max(1, Math.min(24, options.rotationIntervalHours));
    }
    if (options.shiftKillswitch) {
      this.shiftKillswitch = { ...this.shiftKillswitch, ...options.shiftKillswitch };
    }
    this.persistConfig();
  }

  public getState(): TunnelState {
    const now = Date.now();
    let remainingMinutes = 0;
    if (this.status === 'active' && this.expiresAt && this.activeMode === 'quick') {
      remainingMinutes = Math.max(0, Math.round((this.expiresAt - now) / 60000));
    }

    return {
      status: this.status,
      mode: this.activeMode,
      url: this.currentUrl || this.configuredDomain,
      domain: this.configuredDomain,
      hasTokenConfigured: Boolean(this.token),
      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
      expiresAt: this.expiresAt ? new Date(this.expiresAt).toISOString() : null,
      expiresInMinutes: remainingMinutes,
      rotationIntervalHours: this.rotationIntervalHours,
      rotationCount: this.rotationCount,
      error: this.lastError,
      shiftKillswitch: { ...this.shiftKillswitch },
      metrics: {
        totalRotations: this.rotationCount,
        lastRotationAt: this.lastRotationAt,
        uptimeSeconds: this.totalUptimeSeconds,
      },
    };
  }
}

declare global {
  var __restrodash_tunnel_manager: TunnelManager | undefined;
}

const tunnelManager = globalThis.__restrodash_tunnel_manager ?? new TunnelManager();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__restrodash_tunnel_manager = tunnelManager;
}

export default tunnelManager;
