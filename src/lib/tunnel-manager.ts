import { Tunnel } from 'cloudflared';
import fs from 'fs';
import path from 'path';

export interface TunnelState {
  status: 'stopped' | 'starting' | 'active' | 'rotating' | 'error';
  url: string | null;
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

class TunnelManager {
  private activeTunnel: any = null;
  private currentUrl: string | null = null;
  private status: TunnelState['status'] = 'stopped';
  private startedAt: number | null = null;
  private expiresAt: number | null = null;
  private rotationIntervalHours: number = 8; // Default: 8-hour session rotation
  private rotationCount: number = 0;
  private lastError: string | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private nightCheckInterval: NodeJS.Timeout | null = null;
  private uptimeInterval: NodeJS.Timeout | null = null;
  private totalUptimeSeconds: number = 0;
  private lastRotationAt: string | null = null;

  // Security Shift Killswitch: Shuts down tunnel when restaurant is closed
  private shiftKillswitch = {
    enabled: true,
    closeHour: 23, // 11:00 PM
    openHour: 7,   // 07:00 AM
  };

  constructor() {
    this.setupProcessCleanup();
    this.startNightWatch();
  }

  private get stateFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // Ignore fallback
      }
    }
    return path.join(dataDir, 'tunnel-state.json');
  }

  private persistState() {
    try {
      const state = this.getState();
      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch {
      // Ignore write errors during shutdown
    }
  }

  private isNightTime(): boolean {
    if (!this.shiftKillswitch.enabled) return false;
    const currentHour = new Date().getHours();
    if (this.shiftKillswitch.closeHour > this.shiftKillswitch.openHour) {
      // e.g. close at 23, open at 7 (crosses midnight)
      return currentHour >= this.shiftKillswitch.closeHour || currentHour < this.shiftKillswitch.openHour;
    }
    return currentHour >= this.shiftKillswitch.closeHour && currentHour < this.shiftKillswitch.openHour;
  }

  private startNightWatch() {
    if (this.nightCheckInterval) clearInterval(this.nightCheckInterval);
    // Check every 5 minutes if shift has closed
    this.nightCheckInterval = setInterval(() => {
      if (this.isNightTime() && this.status === 'active') {
        console.log('[TunnelManager 🛡️] Night mode activated. Restaurant shift ended. Shutting down tunnel to secure local counter PC.');
        this.stop('Shift hours ended (Night Mode Killswitch)');
      }
    }, 5 * 60 * 1000);
  }

  private setupProcessCleanup() {
    const cleanup = () => {
      if (this.activeTunnel) {
        try {
          this.activeTunnel.stop ? this.activeTunnel.stop() : this.activeTunnel._stop?.();
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
   * Starts the automatic Cloudflare tunnel
   */
  public async start(targetPort: number = Number(process.env.PORT) || 3000): Promise<string> {
    if (this.isNightTime()) {
      const msg = `Tunnel start blocked by Night Mode Killswitch (Restaurant closed between ${this.shiftKillswitch.closeHour}:00 and ${this.shiftKillswitch.openHour}:00).`;
      console.warn(`[TunnelManager 🛡️] ${msg}`);
      this.status = 'stopped';
      this.lastError = msg;
      this.persistState();
      throw new Error(msg);
    }

    if (this.status === 'active' && this.currentUrl && this.activeTunnel) {
      return this.currentUrl;
    }

    this.status = 'starting';
    this.lastError = null;
    this.persistState();

    return new Promise<string>((resolve, reject) => {
      try {
        const targetUrl = `http://localhost:${targetPort}`;
        console.log(`[TunnelManager 🚀] Initializing automatic Cloudflare quick tunnel to ${targetUrl}...`);

        const tunnel = Tunnel.quick(targetUrl);
        this.activeTunnel = tunnel;

        const timeout = setTimeout(() => {
          if (this.status === 'starting') {
            this.status = 'error';
            this.lastError = 'Tunnel connection timed out after 20 seconds.';
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

          console.log(`[TunnelManager ✅] Tunnel LIVE: ${this.currentUrl}`);
          console.log(`[TunnelManager 🔒] Security rotation scheduled in ${this.rotationIntervalHours} hours.`);

          this.scheduleRotation();
          this.startUptimeTracker();
          this.persistState();
          resolve(emittedUrl);
        });

        tunnel.on('error', (err: any) => {
          console.error('[TunnelManager ❌] Tunnel error:', err);
          this.lastError = err?.message || String(err);
          this.status = 'error';
          this.persistState();
        });

        tunnel.on('exit', (code: number | null) => {
          console.log(`[TunnelManager ℹ️] Tunnel process exited with code ${code}`);
          if (this.status === 'active') {
            this.status = 'stopped';
            this.currentUrl = null;
            this.persistState();
          }
        });
      } catch (err: any) {
        this.status = 'error';
        this.lastError = err?.message || 'Failed to spawn cloudflared tunnel';
        this.persistState();
        reject(err);
      }
    });
  }

  /**
   * Gracefully stops the tunnel
   */
  public stop(reason: string = 'User requested stop') {
    console.log(`[TunnelManager 🛑] Stopping tunnel. Reason: ${reason}`);
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
        if (typeof this.activeTunnel.stop === 'function') {
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
    this.persistState();
  }

  /**
   * Forces an immediate tunnel rotation to generate a fresh, secure URL
   */
  public async rotate(targetPort: number = Number(process.env.PORT) || 3000): Promise<string> {
    console.log('[TunnelManager 🔄] Performing security rotation: Invalidating previous URL & spawning fresh tunnel...');
    this.status = 'rotating';
    this.persistState();

    // 1. Tear down old tunnel
    if (this.activeTunnel) {
      try {
        if (typeof this.activeTunnel.stop === 'function') {
          this.activeTunnel.stop();
        } else if (typeof this.activeTunnel._stop === 'function') {
          this.activeTunnel._stop();
        }
      } catch {
        // Fallback
      }
      this.activeTunnel = null;
    }

    // 2. Clear timer
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }

    // 3. Small pause for socket cleanup
    await new Promise((r) => setTimeout(r, 1200));

    // 4. Start fresh tunnel
    this.rotationCount++;
    this.lastRotationAt = new Date().toISOString();
    return this.start(targetPort);
  }

  /**
   * Schedules automatic rotation when expiration is reached
   */
  private scheduleRotation() {
    if (this.rotationTimer) clearTimeout(this.rotationTimer);

    const lifetimeMs = this.rotationIntervalHours * 60 * 60 * 1000;
    this.rotationTimer = setTimeout(async () => {
      console.log(`[TunnelManager ⏰] Expiration interval (${this.rotationIntervalHours}h) reached. Auto-rotating tunnel to mitigate exposure risk...`);
      try {
        await this.rotate();
      } catch (err) {
        console.error('[TunnelManager ⚠️] Automatic rotation failed:', err);
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

  /**
   * Updates configuration settings
   */
  public configure(options: {
    rotationIntervalHours?: number;
    shiftKillswitch?: { enabled: boolean; closeHour: number; openHour: number };
  }) {
    if (options.rotationIntervalHours !== undefined) {
      this.rotationIntervalHours = Math.max(1, Math.min(24, options.rotationIntervalHours));
      // Reschedule if currently active
      if (this.status === 'active') {
        this.scheduleRotation();
      }
    }
    if (options.shiftKillswitch) {
      this.shiftKillswitch = { ...this.shiftKillswitch, ...options.shiftKillswitch };
    }
    this.persistState();
  }

  /**
   * Returns current snapshot of tunnel state and security metrics
   */
  public getState(): TunnelState {
    const now = Date.now();
    let remainingMinutes = 0;
    if (this.status === 'active' && this.expiresAt) {
      remainingMinutes = Math.max(0, Math.round((this.expiresAt - now) / 60000));
    }

    return {
      status: this.status,
      url: this.currentUrl,
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

// Preserve singleton across Next.js Turbopack fast-refreshes
declare global {
  var __restrodash_tunnel_manager: TunnelManager | undefined;
}

const tunnelManager = globalThis.__restrodash_tunnel_manager ?? new TunnelManager();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__restrodash_tunnel_manager = tunnelManager;
}

export default tunnelManager;
