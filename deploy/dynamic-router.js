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
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const SAAS_PORT = 3005; // Next.js portal runs internally on port 3005

// Create proxy server with WebSocket support
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
        <body style="font-family:sans-serif;padding:40px;text-align:center;background:#ffffff;color:#181d26;">
          <h2 style="font-weight:500;">Restaurant Instance Starting Up...</h2>
          <p style="color:#41454d;">The POS engine is initializing for this subdomain. Please refresh in a few seconds.</p>
        </body>
      </html>
    `);
  }
});

// Locate pos-engine directory robustly
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
  return candidates[0];
}

// Locate instances directory robustly
function findInstancesDir() {
  const candidates = [
    path.resolve(__dirname, '../instances'),
    '/opt/restrodash/instances',
    path.resolve(__dirname, '../../instances'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'registry.json'))) {
      return dir;
    }
  }
  return candidates[0];
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

// Active spawned child processes
const activeProcesses = new Map();

function ensureTenantRunning(tenant) {
  if (activeProcesses.has(tenant.subdomain)) return;

  const posEngineDir = findPosEngineDir();
  const posScript = path.join(posEngineDir, 'dev-server.js');

  if (!fs.existsSync(posScript)) {
    console.warn('[Router] POS engine script not found at', posScript);
    return;
  }

  console.log(`[Router] Spawning POS instance for "${tenant.subdomain}" on port ${tenant.ports.api}...`);

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(tenant.ports.api),
    KDS_PORT: String(tenant.ports.kds),
    SERVER_APP_PORT: String(tenant.ports.serverApp),
    FLO_E2E_DB_PATH: tenant.dbPath,
    DATABASE_PATH: tenant.dbPath,
  };

  const child = spawn(process.execPath, [posScript], {
    env,
    cwd: posEngineDir,
    stdio: 'inherit',
    detached: true,
  });

  child.unref();
  activeProcesses.set(tenant.subdomain, child);
}

// Main HTTP Server
const server = http.createServer((req, res) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();

  // Check if request is for apex domain
  const isApex = host === 'restrodash.in' || host === 'www.restrodash.in' || host === 'localhost';

  if (isApex) {
    return proxy.web(req, res, { target: `http://127.0.0.1:${SAAS_PORT}` });
  }

  // Extract subdomain: e.g. "olivebistro" from "olivebistro.restrodash.in"
  const subdomain = host.replace('.restrodash.in', '');
  const tenant = getTenantRecord(subdomain);

  if (!tenant) {
    // Unknown subdomain -> redirect to main portal
    res.writeHead(302, { Location: 'https://restrodash.in' });
    return res.end();
  }

  // Auto-start tenant instance if not already running
  ensureTenantRunning(tenant);

  // Proxy to the tenant's specific POS API port
  proxy.web(req, res, { target: `http://127.0.0.1:${tenant.ports.api}` });
});

// WebSocket upgrade handler (for KDS & table cart sync)
server.on('upgrade', (req, socket, head) => {
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
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${targetPort}` });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`⚡ RestroDash Dynamic Router running on port ${PORT}`);
  console.log(`  • Next.js Portal Target: :${SAAS_PORT}`);
  console.log(`  • POS Engine Dir: ${findPosEngineDir()}`);
});
