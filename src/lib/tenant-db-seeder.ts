import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { registerTenantInstance, TenantInstanceRecord } from './instance-registry';

export interface ProvisioningPayload {
  subdomain: string;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  masterPin?: string;
  approvalPin?: string;
  tableCount?: number;
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  taxPercentage?: number;
  plan?: 'monthly_35k' | 'annual';
}

export interface ProvisioningResult {
  success: boolean;
  subdomain: string;
  liveUrl: string;
  ports: {
    api: number;
    kds: number;
    serverApp: number;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
  dbPath: string;
  createdAt: string;
}

/**
 * Initializes schema and pre-seeds an isolated restro.db for a new restaurant instance
 */
export function provisionTenantInstance(
  payload: ProvisioningPayload,
  instancesBaseDir?: string
): ProvisioningResult {
  const subdomain = payload.subdomain.trim().toLowerCase();
  const restaurantName = payload.restaurantName.trim();
  const ownerName = payload.ownerName.trim();
  const ownerEmail = payload.ownerEmail.trim().toLowerCase();
  const ownerPassword = payload.ownerPassword;
  const masterPin = payload.masterPin || '1234';
  const approvalPin = payload.approvalPin || '1234';
  const tableCount = payload.tableCount && payload.tableCount > 0 ? payload.tableCount : 10;
  const currency = payload.currency || 'INR';
  const currencySymbol = payload.currencySymbol || '₹';
  const timezone = payload.timezone || 'Asia/Kolkata';
  const taxPercentage = payload.taxPercentage ?? 5.0;
  const plan = payload.plan || 'monthly_35k';

  // 1. Create instance workspace directory
  const baseDir = instancesBaseDir || path.join(process.cwd(), 'instances');
  const workspacePath = path.join(baseDir, subdomain);
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  const dbPath = path.join(workspacePath, 'restro.db');

  // 2. Open SQLite database connection in WAL mode
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  // 3. Create FloCafe Full Schema v109
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      parent_id TEXT,
      slug TEXT,
      color TEXT,
      icon TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      cost REAL DEFAULT 0,
      sku TEXT,
      barcode TEXT,
      sale_unit TEXT NOT NULL DEFAULT 'each',
      allow_fractional_quantity INTEGER NOT NULL DEFAULT 0,
      weight_precision INTEGER NOT NULL DEFAULT 3,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      track_inventory INTEGER DEFAULT 0,
      stock_quantity REAL DEFAULT 0,
      low_stock_threshold REAL DEFAULT 5,
      tax_type TEXT DEFAULT 'none',
      tax_rate REAL DEFAULT 0,
      tax_category_id TEXT DEFAULT NULL,
      tax_behavior TEXT DEFAULT 'country_default',
      cb_percent REAL DEFAULT 0,
      tags TEXT,
      inventory_product_id TEXT DEFAULT NULL,
      inventory_deduction_quantity REAL DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS addon_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_required INTEGER DEFAULT 0,
      min_selection INTEGER DEFAULT 0,
      max_selection INTEGER DEFAULT 1,
      allow_multiple_quantities INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS addons (
      id TEXT PRIMARY KEY,
      addon_group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      tax_category_id TEXT DEFAULT NULL,
      tax_behavior TEXT DEFAULT 'country_default',
      inherit_parent_tax_category INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available',
      floor TEXT,
      section TEXT,
      position_x REAL,
      position_y REAL,
      kitchen_station_id TEXT,
      is_active INTEGER DEFAULT 1,
      qr_token TEXT UNIQUE,
      active_session_key TEXT DEFAULT NULL,
      qr_session_started_at TEXT DEFAULT NULL,
      qr_session_code TEXT DEFAULT NULL,
      shared_cart_json TEXT DEFAULT NULL,
      qr_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reservation_customer_id TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      country_code TEXT DEFAULT '+91',
      address TEXT,
      notes TEXT,
      tag_counts TEXT DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      pin TEXT,
      pin_hash TEXT,
      category_ids TEXT,
      is_active INTEGER DEFAULT 1,
      terms_accepted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      table_id TEXT,
      customer_id TEXT,
      user_id TEXT,
      type TEXT DEFAULT 'takeaway',
      delivery_address TEXT DEFAULT NULL,
      guest_count INTEGER,
      special_instructions TEXT,
      packaging_charge REAL DEFAULT 0,
      delivery_charge REAL DEFAULT 0,
      service_charge REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_breakdown TEXT,
      tax_snapshot TEXT DEFAULT NULL,
      discount_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      is_qr INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT DEFAULT NULL,
      qr_customer_name TEXT DEFAULT NULL,
      qr_customer_phone TEXT DEFAULT NULL,
      qr_device_session_key TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      inventory_deducted_quantity REAL NOT NULL DEFAULT 0,
      inventory_product_id TEXT DEFAULT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      tax_breakdown TEXT,
      tax_snapshot TEXT DEFAULT NULL,
      tax_type TEXT,
      discount_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      variant_selection TEXT,
      modifier_selection TEXT,
      addons TEXT,
      special_instructions TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      order_id INTEGER NOT NULL,
      customer_id TEXT,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_breakdown TEXT,
      tax_snapshot TEXT DEFAULT NULL,
      discount_amount REAL DEFAULT 0,
      discount_type TEXT,
      discount_value REAL,
      discount_reason TEXT,
      delivery_charge REAL DEFAULT 0,
      packaging_charge REAL DEFAULT 0,
      service_charge REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      total REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      payment_details TEXT,
      paid_at TEXT,
      printed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'cash',
      is_active INTEGER DEFAULT 1,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS printers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      connection_type TEXT NOT NULL DEFAULT 'network',
      ip_address TEXT,
      port INTEGER DEFAULT 9100,
      is_default INTEGER DEFAULT 0,
      cash_drawer_pulse_enabled INTEGER NOT NULL DEFAULT 0,
      paper_width TEXT DEFAULT '80mm',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kitchen_stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_ids TEXT,
      printer_id TEXT,
      printer_ip TEXT,
      printer_port INTEGER DEFAULT 9100,
      printer_name TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS station_users (
      user_id TEXT NOT NULL,
      station_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, station_id)
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      opening_cash REAL NOT NULL DEFAULT 0,
      closing_cash REAL,
      expected_cash REAL,
      cash_difference REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS _flo_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Explicitly set PRAGMA user_version to 109 so FloCafe recognises it as up to date!
  db.pragma('user_version = 109');

  // 4. Seed Settings
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const nowIso = new Date().toISOString();

  const settingsToInsert: Record<string, string> = {
    business_name: restaurantName,
    subdomain: subdomain,
    currency: currency,
    currency_symbol: currencySymbol,
    timezone: timezone,
    tax_rate: String(taxPercentage),
    master_pin: masterPin,
    owner_approval_pin: approvalPin,
    jwt_secret: jwtSecret,
    server_app_enabled: '1',
    kds_enabled: '1',
    schema_version: '109',
    plan: plan,
  };

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const insertManySettings = db.transaction(() => {
    for (const [k, v] of Object.entries(settingsToInsert)) {
      insertSetting.run(k, v, nowIso);
    }
  });
  insertManySettings();

  // 5. Seed Root Owner Account
  const ownerId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const passwordHash = bcrypt.hashSync(ownerPassword, 10);
  const pinHash = bcrypt.hashSync(masterPin, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password, role, pin, pin_hash, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'owner', ?, ?, 1, ?, ?)
  `).run(ownerId, ownerName, ownerEmail, passwordHash, masterPin, pinHash, nowIso, nowIso);

  // 6. Seed Dining Tables with unique QR Tokens
  const insertTable = db.prepare(`
    INSERT INTO tables (id, number, capacity, status, is_active, qr_token, qr_enabled, created_at, updated_at)
    VALUES (?, ?, ?, 'available', 1, ?, 1, ?, ?)
  `);

  const insertTablesTx = db.transaction(() => {
    for (let i = 1; i <= tableCount; i++) {
      const tableNumberStr = i < 10 ? `0${i}` : `${i}`;
      const tableId = `tbl_${tableNumberStr}`;
      const tableNumber = `T-${tableNumberStr}`;
      const qrToken = `tbl_tok_${crypto.randomBytes(16).toString('hex')}`;
      insertTable.run(tableId, tableNumber, 4, qrToken, nowIso, nowIso);
    }
  });
  insertTablesTx();

  // 7. Seed Starter Payment Methods
  const insertPm = db.prepare(`
    INSERT INTO payment_methods (id, name, type, is_active, is_system, sort_order, created_at)
    VALUES (?, ?, ?, 1, 1, ?, ?)
  `);
  insertPm.run('pm_cash', 'Cash', 'cash', 1, nowIso);
  insertPm.run('pm_upi', 'UPI / QR Code', 'upi', 2, nowIso);
  insertPm.run('pm_card', 'Card Terminal', 'card', 3, nowIso);

  // 8. Seed Starter Menu Categories
  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, sort_order, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `);
  insertCat.run('cat_bev', 'Beverages', 1, nowIso);
  insertCat.run('cat_app', 'Appetizers', 2, nowIso);
  insertCat.run('cat_main', 'Main Course', 3, nowIso);
  insertCat.run('cat_dessert', 'Desserts', 4, nowIso);

  // Turn foreign keys back on & close DB
  db.pragma('foreign_keys = ON');
  db.close();

  // 9. Register Instance & Allocate Ports
  const registeredInstance: TenantInstanceRecord = registerTenantInstance(
    {
      subdomain,
      restaurantName,
      ownerEmail,
      dbPath,
      workspacePath,
      status: 'active',
      plan: plan,
    },
    baseDir
  );

  // 10. Generate Root JWT Session Token for the Owner
  const token = jwt.sign(
    {
      userId: ownerId,
      email: ownerEmail,
      name: ownerName,
      role: 'owner',
      subdomain: subdomain,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

  return {
    success: true,
    subdomain,
    liveUrl: `https://${subdomain}.restrodash.in`,
    ports: registeredInstance.ports,
    owner: {
      id: ownerId,
      name: ownerName,
      email: ownerEmail,
      role: 'owner',
    },
    token,
    dbPath,
    createdAt: registeredInstance.createdAt,
  };
}
