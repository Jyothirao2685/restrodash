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

  // If a database already exists, close any handles and remove/reinitialize
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // file might be locked
    }
  }

  // 2. Open SQLite database connection in WAL mode
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 3. Create Core Schema Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'server', 'chef')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'billing')),
      qr_token TEXT UNIQUE,
      active_order_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      tax_percentage REAL NOT NULL DEFAULT 5.0,
      is_available INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded')),
      payment_method TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      notes TEXT,
      station TEXT DEFAULT 'kitchen',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS _flo_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

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
    schema_version: '101',
    plan: plan,
  };

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
  `);

  const insertManySettings = db.transaction(() => {
    for (const [k, v] of Object.entries(settingsToInsert)) {
      insertSetting.run(k, v, nowIso);
    }
  });
  insertManySettings();

  // 5. Seed Owner Admin User
  const ownerId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const passwordHash = bcrypt.hashSync(ownerPassword, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'owner', 1, ?, ?)
  `).run(ownerId, ownerName, ownerEmail, passwordHash, nowIso, nowIso);

  // 6. Seed Dining Tables with unique QR Tokens
  const insertTable = db.prepare(`
    INSERT INTO tables (id, name, capacity, status, qr_token, created_at, updated_at)
    VALUES (?, ?, ?, 'available', ?, ?, ?)
  `);

  const insertTablesTx = db.transaction(() => {
    for (let i = 1; i <= tableCount; i++) {
      const tableNumberStr = i < 10 ? `0${i}` : `${i}`;
      const tableId = `tbl_${tableNumberStr}`;
      const tableName = `T-${tableNumberStr}`;
      const qrToken = `tbl_tok_${crypto.randomBytes(16).toString('hex')}`;
      insertTable.run(tableId, tableName, 4, qrToken, nowIso, nowIso);
    }
  });
  insertTablesTx();

  // 7. Seed Default Payment Methods
  const insertPaymentMethod = db.prepare(`
    INSERT INTO payment_methods (id, name, is_active, created_at)
    VALUES (?, ?, 1, ?)
  `);

  const defaultPayments = [
    { id: 'pm_cash', name: 'Cash' },
    { id: 'pm_upi', name: 'UPI / QR Code' },
    { id: 'pm_card', name: 'Card Terminal' },
  ];

  const insertPaymentsTx = db.transaction(() => {
    for (const pm of defaultPayments) {
      insertPaymentMethod.run(pm.id, pm.name, nowIso);
    }
  });
  insertPaymentsTx();

  // 8. Seed Starter Categories & Products
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, sort_order, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `);

  const categories = [
    { id: 'cat_beverages', name: 'Beverages', order: 1 },
    { id: 'cat_appetizers', name: 'Appetizers', order: 2 },
    { id: 'cat_mains', name: 'Main Course', order: 3 },
    { id: 'cat_desserts', name: 'Desserts', order: 4 },
  ];

  const insertCatsTx = db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(cat.id, cat.name, cat.order, nowIso);
    }
  });
  insertCatsTx();

  // Close database connection
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
