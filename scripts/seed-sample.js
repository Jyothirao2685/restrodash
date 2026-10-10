const Database = require('better-sqlite3');
const db = new Database('flo.db');

db.prepare("INSERT OR IGNORE INTO categories (id, name, is_active) VALUES (?, ?, ?)").run('cat-beverages', 'Beverages', 1);

db.prepare("INSERT OR IGNORE INTO products (id, name, price, category_id, is_active) VALUES (?, ?, ?, ?, ?)").run('prod-masala-chai', 'Masala Chai', 40.00, 'cat-beverages', 1);

db.prepare("INSERT OR IGNORE INTO tables (id, number, capacity, is_active, status, qr_enabled) VALUES (?, ?, ?, ?, ?, ?)").run('table-1', 'Table 1', 4, 1, 'available', 1);

console.log('Sample table, category, and product inserted!');
