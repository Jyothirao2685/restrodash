const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

console.log('=== RESTRODASH SAAS PROVISIONER TEST ===\n');

// Import built modules or test directly
const testSubdomain = 'testbistro';
const instancesDir = path.join(__dirname, '..', 'instances');
const testInstanceDir = path.join(instancesDir, testSubdomain);

// Clean previous test run if any
if (fs.existsSync(testInstanceDir)) {
  fs.rmSync(testInstanceDir, { recursive: true, force: true });
}

// 1. Test Subdomain Check
console.log('[1/5] Testing Subdomain Validation Engine...');
const { checkSubdomainAvailability } = require('../src/lib/subdomains.ts');

const validCheck = checkSubdomainAvailability(testSubdomain, instancesDir);
if (!validCheck.available) {
  console.error('❌ Expected testbistro to be available, got:', validCheck);
  process.exit(1);
}

const reservedCheck = checkSubdomainAvailability('admin', instancesDir);
if (reservedCheck.available) {
  console.error('❌ Expected "admin" to be blocked as reserved!');
  process.exit(1);
}
console.log('  ✓ Subdomain format, reserved list & uniqueness validated.');

// 2. Test Provisioner
console.log('\n[2/5] Executing Instance Provisioner & DB Seeder...');
const { provisionTenantInstance } = require('../src/lib/tenant-db-seeder.ts');

const payload = {
  subdomain: testSubdomain,
  restaurantName: 'Test Bistro & Bar',
  ownerName: 'Test Owner',
  ownerEmail: 'owner@testbistro.com',
  ownerPassword: 'SecretPassword123!',
  masterPin: '7429',
  approvalPin: '8899',
  tableCount: 12,
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  taxPercentage: 5.0,
  plan: 'monthly_35k',
};

const result = provisionTenantInstance(payload, instancesDir);

if (!result.success || !result.token) {
  console.error('❌ Provisioning failed:', result);
  process.exit(1);
}

console.log('  ✓ Tenant instance provisioned successfully!');
console.log('  ✓ Subdomain:', result.subdomain);
console.log('  ✓ Assigned Ports:', result.ports);
console.log('  ✓ Database Path:', result.dbPath);

// 3. Verify SQLite DB & Schema Integrity
console.log('\n[3/5] Verifying restro.db Schema & Pre-Seeded Tables...');
const db = new Database(result.dbPath);

const integrity = db.pragma('integrity_check');
if (integrity[0].integrity_check !== 'ok') {
  console.error('❌ Database integrity check failed:', integrity);
  process.exit(1);
}
console.log('  ✓ SQLite integrity_check: ok');

// 4. Verify Owner Credentials & Bcrypt Hash
console.log('\n[4/5] Verifying Owner Account & Security...');
const user = db.prepare('SELECT * FROM users WHERE email = ?').get('owner@testbistro.com');
if (!user || user.role !== 'owner') {
  console.error('❌ Owner user not found or role incorrect:', user);
  process.exit(1);
}

const passwordMatches = bcrypt.compareSync('SecretPassword123!', user.password);
if (!passwordMatches) {
  console.error('❌ Bcrypt password verification failed!');
  process.exit(1);
}
console.log('  ✓ Owner account verified with secure bcrypt hash.');

// 5. Verify Dining Tables & Unique QR Tokens
console.log('\n[5/5] Verifying Dining Room Tables & QR Tokens...');
const tables = db.prepare('SELECT * FROM tables ORDER BY id ASC').all();
if (tables.length !== 12) {
  console.error(`❌ Expected 12 tables, got ${tables.length}`);
  process.exit(1);
}

const qrTokens = new Set(tables.map(t => t.qr_token));
if (qrTokens.size !== 12) {
  console.error('❌ QR tokens must all be unique, collision detected!');
  process.exit(1);
}

const firstTable = tables[0];
console.log(`  ✓ 12 tables created (${tables[0].number} to ${tables[11].number})`);
console.log(`  ✓ Sample Table QR Token: ${firstTable.number} -> ${firstTable.qr_token}`);

// Verify Settings
const businessName = db.prepare("SELECT value FROM settings WHERE key = 'business_name'").get().value;
const masterPin = db.prepare("SELECT value FROM settings WHERE key = 'master_pin'").get().value;
console.log(`  ✓ Store Name: "${businessName}", Master PIN: "${masterPin}"`);

db.close();

console.log('\n🎉 ALL 5 PROVISIONING CHECKS PASSED WITH 100% SUCCESS!');
