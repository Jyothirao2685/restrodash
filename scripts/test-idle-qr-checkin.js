// scripts/test-idle-qr-checkin.js
// Tests the 5-minute idle table check-in prompt and manual staff table release.

const http = require('http');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== STARTING IDLE QR TABLE & STAFF RELEASE VERIFICATION ===\n');

  const db = new Database('./flo.db');
  const user = db.prepare("SELECT * FROM users WHERE is_active = 1 LIMIT 1").get();
  const secretSetting = db.prepare("SELECT value FROM settings WHERE key = 'jwt_secret'").get();
  const jwtSecret = secretSetting ? secretSetting.value : 'default-secret';
  const staffToken = jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    jwtSecret,
    { expiresIn: '1h' }
  );

  // Pick Table 1
  const table = db.prepare('SELECT id, number, qr_token FROM tables LIMIT 1').get();
  console.log(`[1] Selected Table #${table.number} (ID: ${table.id})`);

  // Ensure table is available before starting
  db.prepare("UPDATE tables SET status = 'available', active_session_key = NULL, qr_session_started_at = NULL WHERE id = ?").run(table.id);

  // 1. Customer A scans QR code
  const sessionCustomerA = 'dsk_cust_a_' + Date.now();
  console.log('\n[2] Customer A scans table QR code (opens /m)...');
  const scanRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${table.qr_token}`,
    method: 'GET',
    headers: { 'x-device-session-key': sessionCustomerA },
  });
  if (scanRes.status !== 200 || scanRes.data?.locked) {
    throw new Error(`Customer A scan failed: ${JSON.stringify(scanRes.data)}`);
  }
  console.log('  ✓ Menu loaded successfully.');

  // Verify DB state: table is occupied and session started
  const tableAfterScan = db.prepare('SELECT status, active_session_key, qr_session_started_at FROM tables WHERE id = ?').get(table.id);
  if (tableAfterScan.status !== 'occupied' || tableAfterScan.active_session_key !== sessionCustomerA) {
    throw new Error(`Table not bound properly: ${JSON.stringify(tableAfterScan)}`);
  }
  console.log(`  ✓ Table is marked "occupied" and bound to session.`);

  // 2. Another customer attempts to scan while occupied
  console.log('\n[3] Second device scans Table 1 while customer A is seated...');
  const secondScan = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${table.qr_token}`,
    method: 'GET',
    headers: { 'x-device-session-key': 'dsk_second_device_999' },
  });
  if (!secondScan.data?.locked) {
    throw new Error('Second device should be locked out!');
  }
  console.log('  ✓ Second device locked: "This table is currently occupied by another customer session"');

  // 3. Simulate 6 minutes passing with NO orders placed
  console.log('\n[4] Simulating 6 minutes of customer browsing without placing an order...');
  const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString().replace('T', ' ').replace(/\..*$/, '');
  db.prepare('UPDATE tables SET qr_session_started_at = ? WHERE id = ?').run(sixMinutesAgo, table.id);

  // 4. POS queries /api/tables/idle-qr
  console.log('\n[5] POS checks for idle QR tables needing waiter check-in...');
  const idleRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/tables/idle-qr',
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (idleRes.status !== 200) throw new Error(`Idle query failed: ${idleRes.status}`);
  const idle = idleRes.data.idle_tables.find((t) => t.id === table.id);
  if (!idle) throw new Error(`Table #${table.number} should be in idle_tables list!`);
  console.log(`  ✓ Table #${table.number} detected as idle (${idle.elapsed_minutes} minutes browsing without ordering).`);

  // 5. Waiter checks in: "Still Deciding" (snooze 5 mins)
  console.log('\n[6] Waiter checks table and taps "Still Deciding (+5m)"...');
  const snoozeRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/tables/${table.id}/snooze-qr-prompt`,
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (snoozeRes.status !== 200) throw new Error(`Snooze failed: ${snoozeRes.status}`);
  console.log('  ✓ Snooze applied.');

  // Verify table is no longer in idle list
  const idleAfterSnooze = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/tables/idle-qr',
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const stillIdle = idleAfterSnooze.data.idle_tables.find((t) => t.id === table.id);
  if (stillIdle) throw new Error('Table should NOT be in idle list after snooze!');
  console.log('  ✓ Table successfully snoozed for 5 minutes.');

  // 6. Customer walks away without ordering -> Staff manually releases table
  console.log('\n[7] Customer walks away. Staff clicks "Release Table"...');
  const releaseRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/tables/${table.id}/release-qr-session`,
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (releaseRes.status !== 200) throw new Error(`Release failed: ${releaseRes.status}`);
  console.log('  ✓ Table released.');

  // Verify DB state: available and session cleared
  const tableAfterRelease = db.prepare('SELECT status, active_session_key, qr_session_started_at FROM tables WHERE id = ?').get(table.id);
  if (tableAfterRelease.status !== 'available' || tableAfterRelease.active_session_key !== null) {
    throw new Error(`Table not cleared: ${JSON.stringify(tableAfterRelease)}`);
  }
  console.log('  ✓ Table status is now "available" and active_session_key is cleared (NULL).');

  // 7. New customer B arrives and scans Table 1
  console.log('\n[8] New dining party scans Table 1...');
  const newScanRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${table.qr_token}`,
    method: 'GET',
    headers: { 'x-device-session-key': 'dsk_new_guest_123' },
  });
  if (newScanRes.status !== 200 || newScanRes.data?.locked) {
    throw new Error('New dining party should be able to scan and browse!');
  }
  console.log('  ✓ New dining party successfully claimed Table 1 with fresh session!');

  // Cleanup: release table for normal use
  db.prepare("UPDATE tables SET status = 'available', active_session_key = NULL, qr_session_started_at = NULL WHERE id = ?").run(table.id);

  console.log('\n🎉 ALL IDLE CHECK-IN AND TABLE RELEASE TESTS PASSED WITH 100% SUCCESS!');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
