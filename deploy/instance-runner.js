// ==============================================================================
// RestroDash Tenant Instance Runner
// Usage: node instance-runner.js <subdomain>
// ==============================================================================

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const subdomain = process.argv[2];
if (!subdomain) {
  console.error('❌ Error: Subdomain argument required. (e.g. node instance-runner.js olivebistro)');
  process.exit(1);
}

// 1. Locate Registry and Workspace
const rootDir = path.resolve(__dirname, '..');
const instancesDir = path.join(rootDir, 'instances');
const registryPath = path.join(instancesDir, 'registry.json');

if (!fs.existsSync(registryPath)) {
  console.error('❌ Error: Instance registry not found at', registryPath);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
const tenant = registry.instances[subdomain];

if (!tenant) {
  console.error(`❌ Error: Tenant "${subdomain}" not found in registry.`);
  process.exit(1);
}

console.log(`\n🚀 Launching RestroDash Instance for "${tenant.restaurantName}" [${subdomain}]...`);
console.log(`  • Database: ${tenant.dbPath}`);
console.log(`  • Ports: API :${tenant.ports.api} | KDS :${tenant.ports.kds} | ServerApp :${tenant.ports.serverApp}`);

// 2. Set Environment Variables for Tenant Isolation
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(tenant.ports.api),
  KDS_PORT: String(tenant.ports.kds),
  SERVER_APP_PORT: String(tenant.ports.serverApp),
  FLO_E2E_DB_PATH: tenant.dbPath,
  DATABASE_PATH: tenant.dbPath,
};

// 3. Locate POS Backend Server Executable
const posServerPath = path.join(rootDir, '..', 'POS', 'dev-server.js');
const fallbackServerPath = path.join(rootDir, 'pos-engine', 'dev-server.js');
const targetServer = fs.existsSync(posServerPath) ? posServerPath : fallbackServerPath;

if (!fs.existsSync(targetServer)) {
  console.error('❌ Error: POS server script not found at', targetServer);
  process.exit(1);
}

// 4. Spawn Tenant Node Process
const child = spawn(process.execPath, [targetServer], {
  env,
  cwd: path.dirname(targetServer),
  stdio: 'inherit',
});

child.on('error', (err) => {
  console.error(`❌ Error running instance for ${subdomain}:`, err);
});

child.on('exit', (code, signal) => {
  console.log(`ℹ️ Instance ${subdomain} exited with code ${code} (signal: ${signal})`);
});
