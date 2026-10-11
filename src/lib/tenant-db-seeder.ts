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

const FULL_SCHEMA_SQL = `
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
    sale_unit TEXT NOT NULL DEFAULT 'each' CHECK (sale_unit IN ('each', 'kg', 'g', 'lb', 'ml', 'cl', 'l', 'fl oz', 'oz')),
    allow_fractional_quantity INTEGER NOT NULL DEFAULT 0,
    weight_precision INTEGER NOT NULL DEFAULT 3 CHECK (weight_precision BETWEEN 0 AND 4),
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
    inventory_product_id TEXT DEFAULT NULL REFERENCES products(id),
    inventory_deduction_quantity REAL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
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
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (addon_group_id) REFERENCES addon_groups(id)
  );

  CREATE TABLE IF NOT EXISTS addon_group_product (
    product_id TEXT NOT NULL,
    addon_group_id TEXT NOT NULL,
    PRIMARY KEY (product_id, addon_group_id)
  );

  CREATE TABLE IF NOT EXISTS category_addon_groups (
    category_id TEXT NOT NULL,
    addon_group_id TEXT NOT NULL,
    PRIMARY KEY (category_id, addon_group_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_group_id) REFERENCES addon_groups(id) ON DELETE CASCADE
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
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS station_users (
    user_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, station_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES kitchen_stations(id) ON DELETE CASCADE
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
    reservation_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL
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
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    phone_digits TEXT GENERATED ALWAYS AS (
      CASE WHEN phone IS NULL THEN NULL
           ELSE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')
      END
    ) VIRTUAL
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
    packaging_tax_category_id TEXT DEFAULT NULL,
    delivery_tax_category_id TEXT DEFAULT NULL,
    service_charge_tax_category_id TEXT DEFAULT NULL,
    discount_amount REAL DEFAULT 0,
    discount_type TEXT,
    discount_value REAL,
    discount_reason TEXT,
    round_off REAL DEFAULT 0,
    total REAL DEFAULT 0,
    cooking_started_at TEXT,
    ready_at TEXT,
    served_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    cancellation_reason TEXT,
    is_qr INTEGER NOT NULL DEFAULT 0,
    approval_status TEXT DEFAULT NULL CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
    qr_customer_name TEXT DEFAULT NULL,
    qr_customer_phone TEXT DEFAULT NULL,
    qr_device_session_key TEXT DEFAULT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    online_platform TEXT DEFAULT NULL,
    external_order_id TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
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
    special_instructions TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    voided_at TEXT DEFAULT NULL,
    recipe_snapshot TEXT DEFAULT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
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
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    split_group_id TEXT,
    split_label TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS loyalty_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    bill_id INTEGER,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kds_pairing_tokens (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    station_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('network', 'usb', 'webusb')),
    ip_address TEXT,
    port INTEGER DEFAULT 9100,
    is_default INTEGER DEFAULT 0,
    cash_drawer_pulse_enabled INTEGER NOT NULL DEFAULT 0,
    paper_width TEXT DEFAULT '80mm',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS country_packs (
    id TEXT PRIMARY KEY,
    publisher TEXT NOT NULL,
    country TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    active_version_id TEXT,
    status TEXT NOT NULL DEFAULT 'installed',
    disclaimer_acknowledged_at TEXT,
    disclaimer_acknowledged_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS country_pack_versions (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    version TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    manifest_json TEXT NOT NULL,
    pack_json TEXT NOT NULL,
    digest TEXT,
    signature TEXT,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    min_flo_version TEXT NOT NULL,
    published_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'staged',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pack_id, version)
  );

  CREATE TABLE IF NOT EXISTS tax_categories (
    id TEXT PRIMARY KEY,
    pack_version_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    label TEXT NOT NULL,
    default_behavior TEXT,
    definition_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pack_version_id, category_id)
  );

  CREATE TABLE IF NOT EXISTS tax_rules (
    id TEXT PRIMARY KEY,
    pack_version_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    label TEXT NOT NULL,
    calculation_type TEXT NOT NULL,
    rate TEXT,
    amount TEXT,
    applies_per TEXT,
    base_rule_ids TEXT,
    definition_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pack_version_id, rule_id)
  );

  CREATE TABLE IF NOT EXISTS tax_overrides (
    id TEXT PRIMARY KEY,
    pack_version_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    field_name TEXT NOT NULL,
    value_json TEXT NOT NULL,
    created_by_user_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS installed_print_templates (
    template_id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    pack_version_id TEXT NOT NULL,
    country TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    display_name TEXT NOT NULL,
    paper_widths_json TEXT NOT NULL,
    renderer_json TEXT NOT NULL,
    template_payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'installed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tax_config_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    pack_id TEXT,
    pack_version_id TEXT,
    override_id TEXT,
    actor_user_id TEXT,
    details_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cloud_sync_outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'delivered', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    last_error TEXT,
    delivered_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS print_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    printed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    print_type TEXT DEFAULT 'receipt',
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sequences (
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (name, date)
  );

  CREATE TABLE IF NOT EXISTS held_orders (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    items TEXT NOT NULL,
    customer_id TEXT,
    guest_count INTEGER DEFAULT 1,
    order_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_item_addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL,
    addon_id TEXT,
    addon_name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS whatsapp_blocklist (
    phone_e164 TEXT PRIMARY KEY,
    reason TEXT,
    blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    blocked_by_user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS support_ticket_outbox (
    client_ticket_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'delivered', 'failed')),
    support_code TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    delivered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS store_diagnostics_outbox (
    event_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'delivered', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    delivered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_transaction_ref_conflicts (
    method TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    detected_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_idempotency (
    user_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, idempotency_key)
  );

  CREATE TABLE IF NOT EXISTS order_idempotency (
    user_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, idempotency_key)
  );

  CREATE TABLE IF NOT EXISTS payment_transaction_refs (
    method TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (method, transaction_id)
  );

  CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    revoked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payment_method_merges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    target_name TEXT NOT NULL,
    affected_payments INTEGER NOT NULL DEFAULT 0,
    merged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bill_items (
    bill_id INTEGER NOT NULL,
    order_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (bill_id, order_item_id),
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'manager', 'cashier', 'server', 'chef')),
    pin TEXT,
    pin_hash TEXT,
    category_ids TEXT,
    is_active INTEGER DEFAULT 1,
    terms_accepted_at TEXT,
    tokens_valid_after TEXT DEFAULT NULL,
    station_assignments_configured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS merchant_print_templates (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL DEFAULT 'local',
    name TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'created' CHECK (origin IN ('created', 'imported', 'cloned')),
    derived_from TEXT,
    document_type TEXT NOT NULL DEFAULT 'receipt' CHECK (document_type IN ('receipt')),
    schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    previous_payload_json TEXT,
    checksum TEXT NOT NULL DEFAULT '',
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(id),
    order_item_id INTEGER REFERENCES order_items(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    method TEXT NOT NULL,
    reason TEXT,
    shift_id TEXT,
    approved_by TEXT NOT NULL REFERENCES users(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    cash_session_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS refund_idempotency (
    user_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, idempotency_key)
  );

  CREATE TABLE IF NOT EXISTS cash_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL DEFAULT 'day' CHECK (scope IN ('day', 'session')),
    business_date TEXT NOT NULL CHECK (business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    opening_float_cents INTEGER NOT NULL DEFAULT 0 CHECK (opening_float_cents >= 0),
    expected_cash_cents INTEGER NOT NULL,
    counted_cash_cents INTEGER NOT NULL CHECK (counted_cash_cents >= 0),
    variance_cents INTEGER NOT NULL,
    gross_collected_cents INTEGER NOT NULL,
    refunded_cents INTEGER NOT NULL,
    net_collected_cents INTEGER NOT NULL,
    bill_count INTEGER NOT NULL,
    refund_count INTEGER NOT NULL,
    payment_methods_json TEXT NOT NULL DEFAULT '[]',
    staff_sales_json TEXT NOT NULL DEFAULT '[]',
    tax_components_json TEXT NOT NULL DEFAULT '[]',
    z_number INTEGER UNIQUE NOT NULL,
    closed_by TEXT NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pay_in_cents INTEGER NOT NULL DEFAULT 0,
    pay_out_cents INTEGER NOT NULL DEFAULT 0,
    safe_drop_cents INTEGER NOT NULL DEFAULT 0,
    cash_movements_json TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS order_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    order_item_id INTEGER REFERENCES order_items(id),
    actor_user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cash_drawer_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_date TEXT NOT NULL CHECK (business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('opening_float', 'pay_in', 'pay_out', 'safe_drop')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    reason TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voided_at TEXT,
    voided_by TEXT REFERENCES users(id),
    void_reason TEXT,
    cash_session_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity_delta REAL NOT NULL CHECK (quantity_delta <> 0),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'cancel_restore', 'adjustment')),
    reference_type TEXT,
    reference_id TEXT,
    reason TEXT,
    actor_user_id TEXT NOT NULL REFERENCES users(id),
    stock_after REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by_user_id TEXT REFERENCES users(id),
    import_batch_id TEXT,
    source_actor_user_id TEXT,
    source_reference_type TEXT,
    source_reference_id TEXT,
    source_reason TEXT,
    source_created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS supplies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_unit TEXT NOT NULL CHECK (base_unit IN ('each', 'g', 'kg', 'ml', 'l')),
    stock_quantity REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS supply_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supply_id TEXT NOT NULL REFERENCES supplies(id),
    quantity_delta REAL NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'count', 'adjustment', 'waste', 'recipe_depletion', 'recipe_restore')),
    unit TEXT NOT NULL CHECK (unit IN ('each', 'g', 'kg', 'ml', 'l')),
    stock_after REAL NOT NULL,
    reason TEXT,
    actor_user_id TEXT NOT NULL REFERENCES users(id),
    reference_type TEXT,
    reference_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    yield_quantity REAL NOT NULL DEFAULT 1 CHECK (yield_quantity > 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipe_items (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    supply_id TEXT NOT NULL REFERENCES supplies(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL CHECK (unit IN ('each', 'g', 'kg', 'ml', 'l')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_by TEXT NOT NULL REFERENCES users(id),
    opened_by_name TEXT NOT NULL DEFAULT '',
    opened_at TEXT NOT NULL,
    opening_float_cents INTEGER NOT NULL DEFAULT 0 CHECK (opening_float_cents >= 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_at TEXT,
    closed_by TEXT REFERENCES users(id),
    closure_id INTEGER REFERENCES cash_closures(id)
  );

  CREATE TABLE IF NOT EXISTS role_permission_overrides (
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'server', 'chef')),
    permission_id TEXT NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
    updated_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role, permission_id)
  );

  CREATE TABLE IF NOT EXISTS user_permission_overrides (
    user_id TEXT NOT NULL REFERENCES users(id),
    permission_id TEXT NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
    updated_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_id)
  );

  CREATE TABLE IF NOT EXISTS authorization_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL REFERENCES users(id),
    target_type TEXT NOT NULL CHECK (target_type IN ('role', 'user')),
    target_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    previous_effect TEXT CHECK (previous_effect IS NULL OR previous_effect IN ('allow', 'deny')),
    next_effect TEXT CHECK (next_effect IS NULL OR next_effect IN ('allow', 'deny')),
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS local_diagnostics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_code TEXT NOT NULL,
    severity TEXT NOT NULL,
    error_class TEXT NOT NULL,
    signature TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata_json TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER REFERENCES bills(id),
    customer_id TEXT REFERENCES customers(id),
    phone_e164 TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
    kind TEXT NOT NULL DEFAULT 'manual_reply' CHECK (kind IN ('bill_receipt','manual_reply','auto_followup','z_report')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','seen','typing','sent','delivered','read','failed')),
    body TEXT NOT NULL,
    external_message_id TEXT,
    error TEXT,
    queued_at TEXT DEFAULT CURRENT_TIMESTAMP,
    seen_at TEXT,
    typing_at TEXT,
    sent_at TEXT,
    delivered_at TEXT,
    read_at TEXT,
    failed_at TEXT,
    created_by_user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS _flo_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

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
  const workspacePath = path.join(/*turbopackIgnore: true*/ baseDir, subdomain);
  if (!fs.existsSync(/*turbopackIgnore: true*/ workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  const dbPath = path.join(workspacePath, 'restro.db');

  // 2. Open SQLite database connection in WAL mode
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  // 3. Create Full Schema
  db.exec(FULL_SCHEMA_SQL);

  // Set PRAGMA user_version to 101 to match latest FloCafe migration schema
  db.pragma('user_version = 101');

  // 4. Seed Settings with full regional and operational identity
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const nowIso = new Date().toISOString();

  const settingsToInsert: Record<string, string> = {
    business_name: restaurantName,
    store_name: restaurantName,
    subdomain: subdomain,
    country: 'IN',
    business_type: 'restaurant',
    service_model: 'finedine',
    language: 'en',
    currency: currency,
    currency_symbol: currencySymbol,
    timezone: timezone,
    tax_rate: String(taxPercentage),
    tax_type: 'exclusive',
    tax_name: 'GST',
    master_pin: masterPin,
    owner_approval_pin: approvalPin,
    jwt_secret: jwtSecret,
    server_app_enabled: '1',
    kds_enabled: '1',
    kot_printing_enabled: '1',
    schema_version: '101',
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
    INSERT INTO payment_methods (name, is_active, sort_order, created_at, updated_at)
    VALUES (?, 1, ?, ?, ?)
  `);
  insertPm.run('Cash', 1, nowIso, nowIso);
  insertPm.run('UPI / QR Code', 2, nowIso, nowIso);
  insertPm.run('Card Terminal', 3, nowIso, nowIso);

  // 8. Seed Starter Menu Categories
  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, sort_order, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `);
  insertCat.run('cat_bev', 'Beverages', 1, nowIso, nowIso);
  insertCat.run('cat_app', 'Appetizers', 2, nowIso, nowIso);
  insertCat.run('cat_main', 'Main Course', 3, nowIso, nowIso);
  insertCat.run('cat_dessert', 'Desserts', 4, nowIso, nowIso);

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
