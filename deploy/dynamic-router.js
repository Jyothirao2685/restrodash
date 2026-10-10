// ==============================================================================
// RestroDash Dynamic Tenant Router
// Listens on Port 3000 (Receives all traffic from Nginx)
// - Routes restrodash.in -> Next.js SaaS Portal (:3005)
// - Routes *.restrodash.in -> Tenant's Dedicated POS Process (:3011, :3021, etc.)
// ==============================================================================

const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const SAAS_PORT = 3005;

const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true,
});

proxy.on('error', (err, req, res) => {
  console.error('[Proxy Error]', err.message);
  if (res && res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Starting Restaurant Instance...</title></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:60px 20px;text-align:center;background:#ffffff;color:#181d26;">
          <h2 style="font-weight:600;font-size:20px;margin-bottom:8px;">Restaurant Instance Initializing...</h2>
          <p style="color:#64748b;font-size:14px;margin-bottom:20px;">The dedicated POS engine is starting up. This page will refresh automatically in a few seconds.</p>
          <script>setTimeout(function(){ window.location.reload(); }, 4000);</script>
        </body>
      </html>
    `);
  }
});

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

function findPosEngineDir() {
  const candidates = [
    '/opt/restrodash/pos-engine',
    path.resolve(__dirname, '../../pos-engine'),
    path.resolve(__dirname, '../pos-engine'),
    path.resolve(__dirname, '../../POS'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'dev-server.js'))) {
      return dir;
    }
  }
  return '/opt/restrodash/pos-engine';
}

function findInstancesDir() {
  const candidates = [
    path.resolve(__dirname, '../instances'),
    '/opt/restrodash/saas/instances',
    '/opt/restrodash/instances',
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'registry.json'))) {
      return dir;
    }
  }
  return path.resolve(__dirname, '../instances');
}

function getTenantRecord(subdomain) {
  const instancesDir = findInstancesDir();
  const registryFile = path.join(instancesDir, 'registry.json');
  if (!fs.existsSync(registryFile)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
    return data.instances ? data.instances[subdomain] : null;
  } catch {
    return null;
  }
}

const activeProcesses = new Map();

function ensureTenantRunning(tenant) {
  if (activeProcesses.has(tenant.subdomain)) return;

  const posEngineDir = findPosEngineDir();
  const posScript = path.join(posEngineDir, 'dev-server.js');

  if (!fs.existsSync(posScript)) {
    console.warn('[Router] POS engine script not found at', posScript);
    return;
  }

  const workspaceDir = tenant.workspacePath || path.join(findInstancesDir(), tenant.subdomain);

  console.log(`[Router] Spawning POS instance for "${tenant.subdomain}" on port ${tenant.ports.api}...`);
  console.log(`  • Workspace (DB): ${workspaceDir}`);

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(tenant.ports.api),
    KDS_PORT: String(tenant.ports.kds),
    SERVER_APP_PORT: String(tenant.ports.serverApp),
    FLO_DEV_USER_DATA: workspaceDir,
    FLO_E2E_DB_PATH: tenant.dbPath,
    DATABASE_PATH: tenant.dbPath,
  };

  const logDir = '/opt/restrodash/logs';
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
  }
  const outLog = path.join(logDir, `${tenant.subdomain}.log`);
  const outStream = fs.openSync(outLog, 'a');

  const child = spawn(process.execPath, [posScript], {
    env,
    cwd: posEngineDir,
    stdio: ['ignore', outStream, outStream],
    detached: true,
  });

  child.on('error', (err) => {
    console.error(`[Router] Process error for "${tenant.subdomain}":`, err.message);
    activeProcesses.delete(tenant.subdomain);
  });

  child.on('exit', (code, signal) => {
    console.warn(`[Router] Process for "${tenant.subdomain}" exited (code ${code}, signal ${signal})`);
    activeProcesses.delete(tenant.subdomain);
  });

  child.unref();
  activeProcesses.set(tenant.subdomain, child);
}

const server = http.createServer(async (req, res) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const isApex = host === 'restrodash.in' || host === 'www.restrodash.in' || host === 'localhost';

  if (isApex) {
    return proxy.web(req, res, { target: `http://127.0.0.1:${SAAS_PORT}` });
  }

  const subdomain = host.replace('.restrodash.in', '');
  const tenant = getTenantRecord(subdomain);

  if (!tenant) {
    res.writeHead(302, { Location: 'https://restrodash.in' });
    return res.end();
  }

  const isRunning = activeProcesses.has(tenant.subdomain);
  ensureTenantRunning(tenant);

  if (!isRunning) {
    req.pause();
    const isReady = await waitForPort(tenant.ports.api, 4000);
    req.resume();

    if (!isReady) {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      return res.end(`
        <html>
          <head><title>Starting Restaurant Instance...</title></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:60px 20px;text-align:center;background:#ffffff;color:#181d26;">
            <h2 style="font-weight:600;font-size:20px;margin-bottom:8px;">Restaurant Instance Initializing...</h2>
            <p style="color:#64748b;font-size:14px;margin-bottom:20px;">The dedicated POS engine for <strong>${tenant.subdomain}</strong> is starting up. Refreshing automatically in 3 seconds...</p>
            <script>setTimeout(function(){ window.location.reload(); }, 3000);</script>
          </body>
        </html>
      `);
    }
  }

  proxy.web(req, res, { target: `http://127.0.0.1:${tenant.ports.api}` });
});

server.on('upgrade', async (req, socket, head) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const isApex = host === 'restrodash.in' || host === 'www.restrodash.in' || host === 'localhost';

  if (isApex) {
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${SAAS_PORT}` });
    return;
  }

  const subdomain = host.replace('.restrodash.in', '');
  const tenant = getTenantRecord(subdomain);

  if (tenant) {
    const targetPort = req.url.startsWith('/kds') ? tenant.ports.kds : tenant.ports.api;
    const isReady = await waitForPort(targetPort, 2000);
    if (isReady) {
      proxy.ws(req, socket, head, { target: `http://127.0.0.1:${targetPort}` });
    } else {
      socket.destroy();
    }
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`⚡ RestroDash Dynamic Router running on port ${PORT}`);
  console.log(`  • Next.js Portal Target: :${SAAS_PORT}`);
  console.log(`  • POS Engine Dir: ${findPosEngineDir()}`);
});
