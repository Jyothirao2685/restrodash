import { Router, Request, Response } from 'express';
import expressRateLimit from 'express-rate-limit';
import {
  getDatabase,
  now,
  withTxn,
  generateOrderNumber,
  getSettingValue,
  insertOrderItemAddons,
  attachEffectiveAddons,
  parseItemJson,
  parseRowJson,
} from '../db';
import { getTenantCurrency } from './bills';
import {
  calculateItemTax,
  calculateConfiguredChargeTaxes,
  combineItemAndChargeTaxes,
  type TenantInfo,
} from '../services/tax';
import { broadcastQrPendingOrder } from '../services/kds';
import { getCurrencyFractionDigits, getCurrencyMinorUnitFactor } from '../countries';

const router = Router();

// Rate limiting for public endpoints (per IP)
const publicMenuRateLimit = expressRateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicOrderRateLimit = expressRateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicStatusRateLimit = expressRateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

interface PublicOrderItemInput {
  product_id: string;
  quantity: number;
  special_instructions?: string;
  addons?: { id: string; quantity?: number }[];
}

/**
 * GET /api/public/table/:qrToken
 * Fetches restaurant branding, table info, menu categories, products,
 * addon groups, and active order status for the scanning device.
 */
router.get('/table/:qrToken', publicMenuRateLimit, (req: Request, res: Response) => {
  try {
    const { qrToken } = req.params;
    if (!qrToken || typeof qrToken !== 'string') {
      return res.status(400).json({ error: 'Valid table token is required' });
    }

    const db = getDatabase();
    const table = db.prepare(`
      SELECT id, number, capacity, qr_token, active_session_key, qr_session_started_at, qr_enabled, is_active, status
      FROM tables
      WHERE qr_token = ?
    `).get(qrToken) as any;

    if (!table || table.is_active === 0 || table.qr_enabled === 0) {
      return res.status(404).json({ error: 'Table not found or QR ordering is disabled' });
    }

    const deviceSessionKey = (req.headers['x-device-session-key'] as string) || null;

    // Check for active orders for this table
    const activeOrders = db.prepare(`
      SELECT id, order_number, status, approval_status, subtotal, tax_amount, total,
             qr_device_session_key, created_at
      FROM orders
      WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')
      ORDER BY created_at DESC
    `).all(table.id) as any[];

    // Session Lock & Occupancy Defense:
    let isTableLocked = false;
    let isOwner = false;

    if (activeOrders.length > 0) {
      if (table.active_session_key) {
        if (deviceSessionKey && deviceSessionKey === table.active_session_key) {
          isOwner = true;
          isTableLocked = false;
        } else {
          isTableLocked = true;
        }
      } else {
        // Table has staff/manual active orders
        isTableLocked = true;
      }
    } else {
      // No active orders currently placed.
      if (table.active_session_key) {
        if (deviceSessionKey && deviceSessionKey === table.active_session_key) {
          isOwner = true;
          isTableLocked = false;
        } else {
          // Different device while a session is active without orders yet.
          // Auto-expire idle sessions after 15 minutes of inactivity:
          const sessionStartMs = table.qr_session_started_at
            ? new Date(table.qr_session_started_at.replace(' ', 'T') + 'Z').getTime()
            : 0;
          const elapsedMinutes = sessionStartMs ? (Date.now() - sessionStartMs) / 60000 : 999;

          if (elapsedMinutes >= 15) {
            if (deviceSessionKey) {
              const currentTime = now();
              db.prepare('UPDATE tables SET active_session_key = ?, qr_session_started_at = ?, status = ?, updated_at = ? WHERE id = ?')
                .run(deviceSessionKey, currentTime, 'occupied', currentTime, table.id);
              table.active_session_key = deviceSessionKey;
              table.qr_session_started_at = currentTime;
              isOwner = true;
            }
            isTableLocked = false;
          } else {
            isTableLocked = true;
          }
        }
      } else {
        // Table is free/available: new scan binds the session and starts the timer!
        if (deviceSessionKey) {
          const currentTime = now();
          db.prepare('UPDATE tables SET active_session_key = ?, qr_session_started_at = ?, status = ?, updated_at = ? WHERE id = ?')
            .run(deviceSessionKey, currentTime, 'occupied', currentTime, table.id);
          table.active_session_key = deviceSessionKey;
          table.qr_session_started_at = currentTime;
          table.status = 'occupied';
          isOwner = true;
        }
        isTableLocked = false;
      }
    }

    if (isTableLocked) {
      return res.json({
        locked: true,
        table_number: table.number,
        reason: 'This table is currently occupied by another customer session. Please ask your server for assistance.',
      });
    }

    // Load store / restaurant branding info
    const storeName = getSettingValue('store_name') || getSettingValue('restaurant_name') || 'FloCafe';
    const storeAddress = getSettingValue('address') || '';
    const storePhone = getSettingValue('phone') || '';
    const currency = getTenantCurrency();

    // Fetch active categories
    const categories = db.prepare(`
      SELECT id, name, sort_order
      FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `).all();

    // Fetch active & available products
    const productRows = db.prepare(`
      SELECT id, name, category_id, price, description, image_url, sort_order, tags
      FROM products
      WHERE is_active = 1 AND deleted_at IS NULL
      ORDER BY sort_order ASC, name ASC
    `).all() as any[];

    const products = productRows.map((p) => {
      let tags: string[] = [];
      try {
        tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : (Array.isArray(p.tags) ? p.tags : []);
      } catch {
        tags = [];
      }
      const isVeg = tags.some((t: string) => typeof t === 'string' && (t.toLowerCase() === 'veg' || t.toLowerCase() === 'vegetarian')) ? 1 : 0;
      return {
        id: p.id,
        name: p.name,
        category_id: p.category_id,
        price: p.price,
        description: p.description,
        image_url: p.image_url,
        sort_order: p.sort_order,
        is_veg: isVeg,
        tags,
      };
    });

    // Fetch active addon groups and their active addons
    const addonGroups = db.prepare(`
      SELECT id, name, is_required, min_selection, max_selection, allow_multiple_quantities
      FROM addon_groups
      WHERE is_active = 1
      ORDER BY name ASC
    `).all() as any[];

    const groupIds = addonGroups.map((g) => g.id);
    let addonsByGroup: Record<string, any[]> = {};
    if (groupIds.length > 0) {
      const ph = groupIds.map(() => '?').join(',');
      const addonRows = db.prepare(`
        SELECT id, addon_group_id, name, price
        FROM addons
        WHERE addon_group_id IN (${ph}) AND is_active = 1
        ORDER BY name ASC
      `).all(...groupIds) as any[];

      for (const row of addonRows) {
        if (!addonsByGroup[row.addon_group_id]) addonsByGroup[row.addon_group_id] = [];
        addonsByGroup[row.addon_group_id].push(row);
      }
    }

    const hydratedAddonGroups = addonGroups.map((g) => ({
      ...g,
      is_required: Boolean(g.is_required),
      allow_multiple_quantities: Boolean(g.allow_multiple_quantities),
      addons: addonsByGroup[g.id] || [],
    }));

    // Build map of product_id -> addon_group_ids
    const productAddonGroupRows = db.prepare('SELECT product_id, addon_group_id FROM addon_group_product').all() as any[];
    const categoryAddonGroupRows = db.prepare('SELECT category_id, addon_group_id FROM category_addon_groups').all() as any[];

    const productAddonGroupsMap: Record<string, string[]> = {};
    const categoryAddonGroupsMap: Record<string, string[]> = {};

    for (const r of categoryAddonGroupRows) {
      if (!categoryAddonGroupsMap[r.category_id]) categoryAddonGroupsMap[r.category_id] = [];
      categoryAddonGroupsMap[r.category_id].push(r.addon_group_id);
    }

    for (const r of productAddonGroupRows) {
      if (!productAddonGroupsMap[r.product_id]) productAddonGroupsMap[r.product_id] = [];
      productAddonGroupsMap[r.product_id].push(r.addon_group_id);
    }

    const productGroupRelations: Record<string, string[]> = {};
    for (const p of products as any[]) {
      const direct = productAddonGroupsMap[p.id] || [];
      const inherited = p.category_id ? (categoryAddonGroupsMap[p.category_id] || []) : [];
      const combined = Array.from(new Set([...direct, ...inherited]));
      if (combined.length > 0) {
        productGroupRelations[p.id] = combined;
      }
    }

    // Hydrate current customer orders if session matches
    let customerActiveOrders: any[] = [];
    if (isOwner && deviceSessionKey) {
      customerActiveOrders = activeOrders.filter((o) => o.qr_device_session_key === deviceSessionKey).map((o) => {
        const items = db.prepare(`
          SELECT id, product_name, quantity, unit_price, total, status, special_instructions
          FROM order_items
          WHERE order_id = ?
        `).all(o.id);
        return {
          ...o,
          items,
        };
      });
    }

    res.json({
      locked: false,
      is_owner: isOwner,
      restaurant: {
        name: storeName,
        address: storeAddress,
        phone: storePhone,
        currency,
      },
      table: {
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        qr_token: table.qr_token,
      },
      categories,
      products,
      addon_groups: hydratedAddonGroups,
      product_addon_groups: productGroupRelations,
      active_orders: customerActiveOrders,
    });
  } catch (error: any) {
    console.error('[Public Menu] Error loading menu:', error);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

/**
 * POST /api/public/orders
 * Places a customer order from the QR menu.
 * Requires waiter/staff approval before kitchen display or printing.
 */
router.post('/orders', publicOrderRateLimit, (req: Request, res: Response) => {
  try {
    const { qr_token, session_key, customer_name, customer_phone, items, special_instructions } = req.body || {};

    if (!qr_token || typeof qr_token !== 'string') {
      return res.status(400).json({ error: 'qr_token is required' });
    }
    if (!session_key || typeof session_key !== 'string' || session_key.trim().length < 8) {
      return res.status(400).json({ error: 'Valid session_key is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    if (items.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 items allowed per order' });
    }

    const db = getDatabase();
    const table = db.prepare(`
      SELECT id, number, qr_token, active_session_key, qr_enabled, is_active, status
      FROM tables
      WHERE qr_token = ?
    `).get(qr_token) as any;

    if (!table || table.is_active === 0 || table.qr_enabled === 0) {
      return res.status(404).json({ error: 'Table not found or QR ordering disabled' });
    }

    // Check active orders and table session binding
    const activeOrders = db.prepare(`
      SELECT id, qr_device_session_key FROM orders
      WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')
    `).all(table.id) as any[];

    if (activeOrders.length > 0) {
      if (table.active_session_key && table.active_session_key !== session_key) {
        return res.status(403).json({ error: 'Table is currently occupied by another guest session' });
      }
    } else {
      // First order of a new session: bind session key and mark occupied
      const currentTime = now();
      db.prepare(`
        UPDATE tables
        SET active_session_key = ?, qr_session_started_at = COALESCE(qr_session_started_at, ?), status = 'occupied', updated_at = ?
        WHERE id = ?
      `).run(session_key, currentTime, currentTime, table.id);
    }

    // Settings for tax calculations
    const settings: Record<string, string> = {};
    db.prepare('SELECT key, value FROM settings').all().forEach((row: any) => {
      settings[row.key] = row.value;
    });

    const tenantInfo: TenantInfo = {
      country: settings.country || '',
      business_type: settings.business_type || 'restaurant',
      state_code: settings.state_code || '',
      currency: getTenantCurrency(),
      taxes_enabled: settings.taxes_enabled === 'true',
    };

    const currency = getTenantCurrency();
    const decimals = getCurrencyFractionDigits(currency);
    const minorFactor = getCurrencyMinorUnitFactor(currency);

    const safeCustomerName = customer_name ? String(customer_name).trim().slice(0, 100) : null;
    const safeCustomerPhone = customer_phone ? String(customer_phone).trim().slice(0, 25) : null;
    const safeNotes = special_instructions ? String(special_instructions).trim().slice(0, 500) : null;

    const result = withTxn(() => {
      const orderNumber = generateOrderNumber();
      const createdAt = now();

      // Insert parent order with approval_status = 'pending_approval' and is_qr = 1
      const orderInsert = db.prepare(`
        INSERT INTO orders (
          order_number, table_id, customer_id, user_id, type,
          special_instructions, status, is_qr, approval_status,
          qr_customer_name, qr_customer_phone, qr_device_session_key,
          subtotal, tax_amount, total, round_off, created_at, updated_at
        )
        VALUES (?, ?, NULL, NULL, 'dine_in', ?, 'pending', 1, 'pending_approval', ?, ?, ?, 0, 0, 0, 0, ?, ?)
      `).run(
        orderNumber,
        table.id,
        safeNotes,
        safeCustomerName,
        safeCustomerPhone,
        session_key,
        createdAt,
        createdAt,
      );

      const orderId = orderInsert.lastInsertRowid;

      let subtotal = 0;
      let totalTax = 0;
      let exclusiveTax = 0;
      const allTaxBreakdowns: any[] = [];
      const allTaxSnapshots: (string | null)[] = [];

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, product_sku, unit_price, quantity,
          inventory_deducted_quantity, inventory_product_id, subtotal, tax_amount,
          tax_breakdown, tax_snapshot, tax_type, discount_amount, total,
          special_instructions, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?, ?)
      `);

      for (const item of items as PublicOrderItemInput[]) {
        if (!item || !item.product_id) {
          throw Object.assign(new Error('Each order item must specify product_id'), { statusCode: 400 });
        }
        const qty = parseInt(String(item.quantity), 10);
        if (isNaN(qty) || qty < 1 || qty > 99) {
          throw Object.assign(new Error('Quantity must be an integer between 1 and 99'), { statusCode: 400 });
        }

        const product = db.prepare(`
          SELECT * FROM products WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
        `).get(item.product_id) as any;

        if (!product) {
          throw Object.assign(new Error(`Product ${item.product_id} is unavailable or not found`), { statusCode: 400 });
        }

        const unitPrice = parseFloat(product.price) || 0;
        let itemSubtotal = unitPrice * qty;

        // Resolve addons
        const validatedAddons: { id: string; name: string; price: number; quantity: number }[] = [];
        if (Array.isArray(item.addons)) {
          for (const addonRef of item.addons) {
            if (!addonRef?.id) continue;
            const addonRow = db.prepare(`
              SELECT a.*, ag.is_active as group_active
              FROM addons a
              JOIN addon_groups ag ON a.addon_group_id = ag.id
              WHERE a.id = ? AND a.is_active = 1 AND ag.is_active = 1
            `).get(addonRef.id) as any;

            if (addonRow) {
              const addonQty = Math.max(1, parseInt(String(addonRef.quantity || 1), 10));
              const addonPrice = parseFloat(addonRow.price) || 0;
              itemSubtotal += addonPrice * addonQty * qty;
              validatedAddons.push({
                id: addonRow.id,
                name: addonRow.name,
                price: addonPrice,
                quantity: addonQty,
              });
            }
          }
        }

        const taxResult = calculateItemTax(tenantInfo, product, itemSubtotal, null);
        totalTax += taxResult.tax_amount;
        if (taxResult.tax_type !== 'inclusive') {
          exclusiveTax += taxResult.tax_amount;
        }
        if (taxResult.tax_breakdown) {
          allTaxBreakdowns.push(taxResult.tax_breakdown);
        }
        const itemTaxSnapshot = taxResult.tax_snapshot ? JSON.stringify(taxResult.tax_snapshot) : null;
        allTaxSnapshots.push(itemTaxSnapshot);

        const itemTotal = itemSubtotal + (taxResult.tax_type === 'inclusive' ? 0 : taxResult.tax_amount);
        subtotal += itemSubtotal;

        const itemNotes = item.special_instructions ? String(item.special_instructions).slice(0, 200) : null;
        const insertResult = insertItem.run(
          orderId,
          product.id,
          product.name,
          product.sku || '',
          unitPrice,
          qty,
          itemSubtotal,
          taxResult.tax_amount,
          JSON.stringify(taxResult.tax_breakdown),
          itemTaxSnapshot,
          taxResult.tax_type,
          itemTotal,
          itemNotes,
          createdAt,
          createdAt,
        );

        if (validatedAddons.length > 0) {
          insertOrderItemAddons(db, insertResult.lastInsertRowid, validatedAddons, createdAt);
        }
      }

      const chargeTaxes = calculateConfiguredChargeTaxes(tenantInfo, {}, null);
      const taxRollup = combineItemAndChargeTaxes({
        itemTaxAmount: totalTax,
        itemExclusiveTaxAmount: exclusiveTax,
        itemBreakdowns: allTaxBreakdowns,
        itemSnapshots: allTaxSnapshots,
        itemTaxRatio: 1,
        chargeTaxes,
        minorFactor,
      });

      const total = Number((subtotal + taxRollup.exclusiveTaxAmount).toFixed(decimals));

      db.prepare(`
        UPDATE orders
        SET subtotal = ?, tax_amount = ?, tax_breakdown = ?, tax_snapshot = ?, total = ?, updated_at = ?
        WHERE id = ?
      `).run(
        subtotal,
        taxRollup.taxAmount,
        JSON.stringify(taxRollup.breakdowns),
        taxRollup.snapshotJson,
        total,
        now(),
        orderId,
      );

      // Table stays occupied
      db.prepare("UPDATE tables SET status = 'occupied', updated_at = ? WHERE id = ?")
        .run(now(), table.id);

      const createdOrder = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)) as any;
      const orderItems = attachEffectiveAddons(
        db,
        db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId).map(parseItemJson) as any[],
      );

      return {
        order: {
          ...createdOrder,
          items: orderItems,
        },
      };
    });

    // Alert staff via POS & KDS WebSocket broadcast
    broadcastQrPendingOrder({
      order_id: result.order.id,
      order_number: result.order.order_number,
      table_id: table.id,
      table_number: table.number,
      customer_name: safeCustomerName,
      total: result.order.total,
      items_count: items.length,
      items: result.order.items,
      created_at: result.order.created_at,
    });

    res.status(201).json({
      success: true,
      order: {
        id: result.order.id,
        order_number: result.order.order_number,
        status: result.order.status,
        approval_status: result.order.approval_status,
        total: result.order.total,
        items: result.order.items,
        created_at: result.order.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Public Menu] Order submission error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Failed to submit order' });
  }
});

/**
 * GET /api/public/orders/:orderId/status
 * Queries live status of an order for customer display.
 * Protected against IDOR by checking x-device-session-key.
 */
router.get('/orders/:orderId/status', publicStatusRateLimit, (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const deviceSessionKey = (req.headers['x-device-session-key'] as string) || '';

    if (!deviceSessionKey) {
      return res.status(401).json({ error: 'Device session key required' });
    }

    const db = getDatabase();
    const order = db.prepare(`
      SELECT id, order_number, table_id, status, approval_status, subtotal, tax_amount, total,
             qr_customer_name, qr_device_session_key, created_at, updated_at
      FROM orders
      WHERE id = ? AND is_qr = 1
    `).get(orderId) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // IDOR protection: only the device that created this order can check its status
    if (order.qr_device_session_key !== deviceSessionKey) {
      return res.status(403).json({ error: 'Forbidden: Device session mismatch' });
    }

    const items = db.prepare(`
      SELECT id, product_name, quantity, unit_price, total, status, special_instructions
      FROM order_items
      WHERE order_id = ?
    `).all(order.id);

    res.json({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      approval_status: order.approval_status,
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      total: order.total,
      customer_name: order.qr_customer_name,
      created_at: order.created_at,
      items,
    });
  } catch (error: any) {
    console.error('[Public Menu] Error fetching order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const publicMenuRoutes = router;
