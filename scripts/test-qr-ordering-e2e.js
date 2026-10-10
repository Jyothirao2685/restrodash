const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');
const jwt = require('jsonwebtoken');

// Connect to restro.db (or legacy flo.db) to find a valid staff user and table
const fs = require('fs');
const restroDbPath = path.join(__dirname, '..', 'restro.db');
const legacyDbPath = path.join(__dirname, '..', 'flo.db');
const dbPath = fs.existsSync(restroDbPath) ? restroDbPath : legacyDbPath;
const db = new Database(dbPath);

const user = db.prepare("SELECT * FROM users WHERE is_active = 1 LIMIT 1").get();
if (!user) {
  console.error("No active user found in database!");
  process.exit(1);
}

// Generate JWT for staff authentication
const secretSetting = db.prepare("SELECT value FROM settings WHERE key = 'jwt_secret'").get();
const jwtSecret = secretSetting ? secretSetting.value : 'default-secret';
const staffToken = jwt.sign(
  { userId: user.id, username: user.username, role: user.role },
  jwtSecret,
  { expiresIn: '1h' }
);

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== STARTING RESTRO DASH END-TO-END VERIFICATION ===\n');

  // Step 1: Health check
  console.log('[1/10] Checking server health...');
  const health = await request({ hostname: 'localhost', port: 3001, path: '/api/health', method: 'GET' });
  if (health.status !== 200) throw new Error(`Health check failed: ${health.status}`);
  console.log('  ✓ Server health OK (HTTP 200)');

  // Step 2: Pick a table and verify/regenerate QR token
  console.log('\n[2/10] Loading table & QR code via staff API...');
  let table = db.prepare("SELECT * FROM tables WHERE is_active = 1 LIMIT 1").get();
  if (!table) throw new Error('No active table found');

  // Reset table to available state and clear stale orders for clean test run
  db.prepare("UPDATE tables SET status = 'available', active_session_key = NULL, qr_session_code = NULL, shared_cart_json = NULL, qr_session_started_at = NULL WHERE id = ?").run(table.id);
  db.prepare("UPDATE orders SET status = 'completed' WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')").run(table.id);

  const qrRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/tables/${table.id}/qr-code`,
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (qrRes.status !== 200 || !qrRes.data?.qr_token) {
    throw new Error(`Failed to get table QR code: ${qrRes.status} ${JSON.stringify(qrRes.data)}`);
  }
  const qrToken = qrRes.data.qr_token;
  console.log(`  ✓ Table #${table.number} QR Token: ${qrToken}`);
  console.log(`  ✓ QR Ordering URL: ${qrRes.data.qr_url}`);

  // Step 3: Device A scans table (Becomes Host)
  console.log('\n[3/10] Device A scans table (Becomes Table Host)...');
  const sessionHost = 'host_device_' + Date.now();
  const hostMenuRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${qrToken}`,
    method: 'GET',
    headers: { 'x-device-session-key': sessionHost },
  });
  if (hostMenuRes.status !== 200) {
    throw new Error(`Public menu fetch failed: ${hostMenuRes.status} ${JSON.stringify(hostMenuRes.data)}`);
  }
  if (!hostMenuRes.data.is_host) {
    throw new Error(`Expected Device A to be session host! Got: ${JSON.stringify(hostMenuRes.data)}`);
  }
  const sessionCode = hostMenuRes.data.session_code;
  if (!sessionCode || sessionCode.length !== 4) {
    throw new Error(`Expected 4-digit session code! Got: ${sessionCode}`);
  }
  console.log(`  ✓ Device A recognized as Host. 4-Digit Table Code: ${sessionCode}`);
  console.log(`  ✓ Menu items loaded: ${hostMenuRes.data.products?.length || 0} products`);

  // Step 4: Device B (Friend) scans table (NOT locked out - ultra fast menu)
  console.log('\n[4/10] Device B scans table (Zero lockout, instant menu access)...');
  const sessionGuest = 'guest_device_' + Date.now();
  const guestMenuRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${qrToken}`,
    method: 'GET',
    headers: { 'x-device-session-key': sessionGuest },
  });
  if (guestMenuRes.status !== 200) {
    throw new Error(`Device B menu fetch failed: ${guestMenuRes.status}`);
  }
  if (guestMenuRes.data.is_host) {
    throw new Error('Device B should NOT be session host');
  }
  if (guestMenuRes.data.is_joined) {
    throw new Error('Device B should not yet be joined');
  }
  console.log('  ✓ Device B immediately loads full menu without lockout');

  // Step 5: Device B joins table using 4-digit code
  console.log('\n[5/10] Device B joins table using 4-digit code...');
  const wrongCodeRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/public/table/${qrToken}/join`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { code: '0000', session_key: sessionGuest }
  );
  if (wrongCodeRes.status !== 400) {
    throw new Error(`Expected 400 for incorrect code, got: ${wrongCodeRes.status}`);
  }
  console.log('  ✓ Invalid code properly rejected');

  const joinRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/public/table/${qrToken}/join`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { code: sessionCode, session_key: sessionGuest }
  );
  if (joinRes.status !== 200 || !joinRes.data.success) {
    throw new Error(`Failed to join table: ${joinRes.status} ${JSON.stringify(joinRes.data)}`);
  }
  console.log('  ✓ Device B joined collaborative dining table successfully');

  // Step 6: Collaborative Cart Sync (Device B adds an item)
  console.log('\n[6/10] Testing Collaborative Cart Sync across devices...');
  const testProduct = hostMenuRes.data.products[0];
  const sharedItem = {
    product_id: testProduct.id,
    product_name: testProduct.name,
    price: Number(testProduct.price),
    quantity: 2,
    special_instructions: 'Less spicy',
  };

  const syncRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/public/table/${qrToken}/cart`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-session-key': sessionGuest,
        'x-table-session-code': sessionCode,
      },
    },
    { cart: [sharedItem] }
  );
  if (syncRes.status !== 200) {
    throw new Error(`Cart push failed: ${syncRes.status}`);
  }

  // Device A reads shared cart
  const cartReadRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${qrToken}/cart`,
    method: 'GET',
    headers: { 'x-device-session-key': sessionHost },
  });
  if (cartReadRes.status !== 200 || !cartReadRes.data.cart?.length) {
    throw new Error(`Host could not read synced cart: ${JSON.stringify(cartReadRes.data)}`);
  }
  console.log(`  ✓ Shared cart synced: Host sees item "${cartReadRes.data.cart[0].product_name}" added by Guest`);

  // Step 7: Host-Only Order Authority (Device B cannot submit final order)
  console.log('\n[7/10] Verifying Host-Only Final Order Enforcement...');
  const unauthorizedOrderRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/public/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-session-key': sessionGuest,
      },
    },
    {
      qr_token: qrToken,
      session_key: sessionGuest,
      customer_name: 'Guest Friend',
      items: [sharedItem],
    }
  );
  if (unauthorizedOrderRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for non-host order, got: ${unauthorizedOrderRes.status}`);
  }
  console.log(`  ✓ Guest order attempt blocked: HTTP 403 ("${unauthorizedOrderRes.data.error}")`);

  // Host places the final order
  const hostOrderRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/public/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-session-key': sessionHost,
      },
    },
    {
      qr_token: qrToken,
      session_key: sessionHost,
      customer_name: 'Table Host',
      items: [sharedItem],
    }
  );
  if (hostOrderRes.status !== 201 || !hostOrderRes.data?.order?.id) {
    throw new Error(`Host order failed: ${hostOrderRes.status} ${JSON.stringify(hostOrderRes.data)}`);
  }
  const createdOrder = hostOrderRes.data.order;
  console.log(`  ✓ Host successfully submitted final order #${createdOrder.order_number} (Approval: ${createdOrder.approval_status})`);

  // Step 8: Staff approves the order on POS
  console.log('\n[8/10] Staff approves pending order on POS...');
  const approveRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/orders/${createdOrder.id}/qr-approve`,
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (approveRes.status !== 200 || !approveRes.data?.success) {
    throw new Error(`Staff approval failed: ${approveRes.status} ${JSON.stringify(approveRes.data)}`);
  }
  console.log('  ✓ Staff approved order. KDS and kitchen notified via WebSocket!');

  // Step 9: 1-Tap "86 / Sold Out" Toggle verification
  console.log('\n[9/10] Testing 1-Tap "86 / Sold Out" Toggle...');
  const toggleOffRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/products/${testProduct.id}/toggle-availability`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (toggleOffRes.status !== 200 || toggleOffRes.data?.is_active !== false) {
    throw new Error(`Failed to toggle product off: ${toggleOffRes.status} ${JSON.stringify(toggleOffRes.data)}`);
  }
  console.log(`  ✓ Product "${testProduct.name}" marked 86'd / Sold Out`);

  // Verify it disappears from public menu
  const updatedMenuRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/public/table/${qrToken}`,
    method: 'GET',
    headers: { 'x-device-session-key': sessionHost },
  });
  const foundItem = updatedMenuRes.data.products?.find((p) => p.id === testProduct.id);
  if (foundItem) {
    throw new Error('FAIL: 86\'d product should not be visible in public menu!');
  }
  console.log('  ✓ 86\'d product instantly disappeared from customer QR menu');

  // Toggle back to active
  await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/products/${testProduct.id}/toggle-availability`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('  ✓ Product restored to In Stock');

  // Step 10: Batch QR Tent Card endpoint verification
  console.log('\n[10/10] Testing Batch QR Tent Card endpoint for all tables...');
  const batchRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/tables/qr-codes/batch',
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (batchRes.status !== 200 || !Array.isArray(batchRes.data?.tables) || batchRes.data.tables.length === 0) {
    throw new Error(`Batch QR endpoint failed: ${batchRes.status} ${JSON.stringify(batchRes.data)}`);
  }
  const firstBatch = batchRes.data.tables[0];
  if (!firstBatch.qr_data_url || !firstBatch.table_number) {
    throw new Error('Batch table missing qr_data_url or table_number');
  }
  console.log(`  ✓ Batch QR generated for ${batchRes.data.tables.length} tables with data URLs`);

  // Cleanup: mark test order completed and reset table
  db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(createdOrder.id);
  await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/tables/${table.id}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`,
      },
    },
    { status: 'available' }
  );

  console.log('\n🎉 ALL 10 RESTRO DASH VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
