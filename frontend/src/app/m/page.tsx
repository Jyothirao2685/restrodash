'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  X,
  AlertTriangle,
  Clock,
  Check,
  ChefHat,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  description?: string | null;
  is_veg: number;
  is_available: number;
  image_url?: string | null;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Addon {
  id: string;
  addon_group_id: string;
  name: string;
  price: number;
}

interface AddonGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selection: number;
  max_selection: number;
  allow_multiple_quantities: boolean;
  addons: Addon[];
}

interface CartItem {
  id: string; // unique item uuid in cart
  product: Product;
  quantity: number;
  special_instructions?: string;
  addons: { id: string; name: string; price: number; quantity: number }[];
}

interface ActiveOrder {
  id: number;
  order_number: string;
  status: string;
  approval_status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
  items: {
    id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    status: string;
    special_instructions?: string;
  }[];
}

interface MenuResponse {
  locked: boolean;
  is_owner?: boolean;
  table_number?: string;
  reason?: string;
  restaurant?: {
    name: string;
    address: string;
    phone: string;
    currency: string;
  };
  table?: {
    id: string;
    number: string;
    capacity: number;
    qr_token: string;
  };
  categories?: Category[];
  products?: Product[];
  addon_groups?: AddonGroup[];
  product_addon_groups?: Record<string, string[]>;
  active_orders?: ActiveOrder[];
}

function getOrCreateDeviceSessionKey(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'flo_customer_device_session_key';
  let key = localStorage.getItem(KEY);
  if (!key) {
    key = 'dsk_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem(KEY, key);
  }
  return key;
}

function CustomerMenuContent() {
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get('t') || searchParams.get('token');

  const [token] = useState<string | null>(() => {
    if (tokenFromQuery) return tokenFromQuery;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/m\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
    return null;
  });
  const [sessionKey] = useState<string>(() => getOrCreateDeviceSessionKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<MenuResponse | null>(null);

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart & Ordering
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Add-on selection modal
  const [activeCustomizingProduct, setActiveCustomizingProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, { id: string; name: string; price: number; quantity: number }>>({});
  const [itemInstructions, setItemInstructions] = useState('');

  // Active orders / Live Tracker view
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    if (token && sessionKey) {
      fetch(`/api/public/table/${encodeURIComponent(token)}`, {
        headers: { 'x-device-session-key': sessionKey },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: MenuResponse) => {
          if (!ignore) {
            setMenuData(data);
            if (data.active_orders) setActiveOrders(data.active_orders);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            setError(err instanceof Error ? err.message : 'Failed to load menu');
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [token, sessionKey]);

  // Refresh helper for polling & post-order refresh
  const refreshMenu = useCallback(async (isSilent = false) => {
    if (!token || !sessionKey) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch(`/api/public/table/${encodeURIComponent(token)}`, {
        headers: { 'x-device-session-key': sessionKey },
      });
      if (res.ok) {
        const data: MenuResponse = await res.json();
        setMenuData(data);
        if (data.active_orders) setActiveOrders(data.active_orders);
      }
    } catch {} finally {
      if (!isSilent) setLoading(false);
    }
  }, [token, sessionKey]);

  // Periodic polling for order status updates if customer has active orders
  useEffect(() => {
    if (!token || !sessionKey || activeOrders.length === 0) return;

    const interval = setInterval(() => {
      refreshMenu(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, sessionKey, activeOrders.length, refreshMenu]);

  const currencySymbol = useMemo(() => {
    const cur = menuData?.restaurant?.currency || 'INR';
    if (cur === 'INR') return '₹';
    if (cur === 'USD') return '$';
    if (cur === 'EUR') return '€';
    if (cur === 'GBP') return '£';
    return cur + ' ';
  }, [menuData?.restaurant?.currency]);

  // Filtered products list
  const allProducts = menuData?.products;
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (vegOnly && p.is_veg !== 1) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [allProducts, selectedCategory, vegOnly, searchQuery]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      let itemPrice = item.product.price;
      for (const addon of item.addons) {
        itemPrice += (addon.price || 0) * (addon.quantity || 1);
      }
      return sum + itemPrice * item.quantity;
    }, 0);
  }, [cart]);

  const totalCartItemCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Check if product has addons
  const getProductAddonGroups = useCallback(
    (product: Product): AddonGroup[] => {
      if (!menuData?.addon_groups || !menuData.product_addon_groups) return [];
      const linkedIds = menuData.product_addon_groups[product.id] || [];
      return menuData.addon_groups.filter((g) => linkedIds.includes(g.id));
    },
    [menuData],
  );

  const handleOpenAdd = (product: Product) => {
    const groups = getProductAddonGroups(product);
    if (groups.length > 0) {
      setActiveCustomizingProduct(product);
      setSelectedAddons({});
      setItemInstructions('');
    } else {
      // Direct add
      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.product.id === product.id && item.addons.length === 0);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity += 1;
          return updated;
        }
        return [
          ...prev,
          {
            id: 'cart_' + Math.random().toString(36).substring(2, 9),
            product,
            quantity: 1,
            addons: [],
          },
        ];
      });
    }
  };

  const handleAddCustomizedItem = () => {
    if (!activeCustomizingProduct) return;
    const addonsList = Object.values(selectedAddons);

    setCart((prev) => [
      ...prev,
      {
        id: 'cart_' + Math.random().toString(36).substring(2, 9),
        product: activeCustomizingProduct,
        quantity: 1,
        addons: addonsList,
        special_instructions: itemInstructions.trim() || undefined,
      },
    ]);

    setActiveCustomizingProduct(null);
    setSelectedAddons({});
    setItemInstructions('');
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handlePlaceOrder = async () => {
    if (!token || cart.length === 0 || placingOrder) return;
    setPlacingOrder(true);
    try {
      const payload = {
        qr_token: token,
        session_key: sessionKey,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        special_instructions: orderNotes.trim() || undefined,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
          addons: item.addons.map((a) => ({ id: a.id, quantity: a.quantity })),
        })),
      };

      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-session-key': sessionKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Order created successfully!
      setCart([]);
      setCartDrawerOpen(false);
      setOrderNotes('');

      // Refresh menu and show active order tracker
      await refreshMenu(true);
      setShowStatusModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not place order. Please try again or ask your server.';
      alert(msg);
    } finally {
      setPlacingOrder(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">Loading Menu...</h2>
        <p className="text-sm text-neutral-500 mt-1">Preparing fresh dishes for you</p>
      </div>
    );
  }

  // 2. Error State
  if (error || !menuData) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Unable to Open Menu</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mt-2">{error || 'Invalid QR code.'}</p>
        {token && (
          <button
            onClick={() => refreshMenu(false)}
            className="mt-6 px-6 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-xl text-sm shadow hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <RefreshCw size={16} /> Retry
          </button>
        )}
      </div>
    );
  }

  // 3. Table Occupied / Session Locked State
  if (menuData.locked) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-5">
          <Utensils size={40} />
        </div>
        <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
          Table {menuData.table_number || ''} is Occupied
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mt-3 leading-relaxed">
          {menuData.reason || 'This table currently has an active dining session. Please scan your own table’s QR code or ask your server for assistance.'}
        </p>
        <div className="mt-8 p-4 bg-card rounded-xl border border-border max-w-xs w-full text-xs text-muted-foreground">
          Tip: If you are sitting at this table, please ask your waiter to take your order or settle the previous check.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* Top Banner / Restaurant Info */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black tracking-tight leading-tight flex items-center gap-1.5">
              <span>{menuData.restaurant?.name || 'FloCafe'}</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                Table {menuData.table?.number}
              </span>
              {menuData.restaurant?.address && (
                <span>&bull; {menuData.restaurant.address}</span>
              )}
            </div>
          </div>

          {activeOrders.length > 0 && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3 py-1.5 text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 rounded-lg flex items-center gap-1.5 shadow-xs animate-pulse"
            >
              <Clock size={13} />
              <span>Track Orders ({activeOrders.length})</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* Search Bar & Veg Filter */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <input
              type="text"
              placeholder="Search dishes, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 ${
              vegOnly
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block border border-white" />
            Veg Only
          </button>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-5 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            All Items
          </button>
          {menuData.categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-dashed border-border p-6">
              <Utensils className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-sm">No items found</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try searching for something else</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const productAddonGroups = getProductAddonGroups(product);
              const hasAddons = productAddonGroups.length > 0;
              const cartItem = cart.find((i) => i.product.id === product.id && i.addons.length === 0);

              return (
                <div
                  key={product.id}
                  className="bg-card rounded-2xl border border-border/80 p-3.5 flex items-start justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Veg / Non-veg symbol */}
                      <span
                        className={`h-4 w-4 rounded-xs border-2 flex items-center justify-center shrink-0 ${
                          product.is_veg === 1 ? 'border-emerald-600' : 'border-red-600'
                        }`}
                        title={product.is_veg === 1 ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            product.is_veg === 1 ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                      </span>
                      <h3 className="font-bold text-sm text-foreground truncate">{product.name}</h3>
                    </div>

                    <p className="text-base font-black text-foreground">
                      {currencySymbol}{product.price}
                    </p>

                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {hasAddons && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-2 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/40">
                        <Sparkles size={10} /> Customisable
                      </span>
                    )}
                  </div>

                  {/* Add / Quantity Button */}
                  <div className="shrink-0 flex flex-col items-center justify-center">
                    {cartItem && !hasAddons ? (
                      <div className="flex items-center bg-orange-600 text-white rounded-xl shadow-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(cartItem.id, -1)}
                          className="px-2.5 py-1.5 hover:bg-orange-700 active:bg-orange-800 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-2 text-xs font-black min-w-[20px] text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(cartItem.id, 1)}
                          className="px-2.5 py-1.5 hover:bg-orange-700 active:bg-orange-800 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(product)}
                        className="px-4 py-1.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-400 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-xs shadow-2xs hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1"
                      >
                        <span>ADD</span>
                        {hasAddons && <Plus size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between font-bold text-sm transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                {totalCartItemCount}
              </span>
              <span>View Cart &bull; {currencySymbol}{cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs uppercase tracking-wider font-extrabold">
              <span>Checkout</span>
              <ChevronRight size={16} />
            </div>
          </button>
        </div>
      )}

      {/* Customization / Add-on Modal */}
      {activeCustomizingProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-card w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="font-bold text-base text-foreground">{activeCustomizingProduct.name}</h3>
                <p className="text-xs text-muted-foreground">{currencySymbol}{activeCustomizingProduct.price}</p>
              </div>
              <button
                onClick={() => setActiveCustomizingProduct(null)}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {getProductAddonGroups(activeCustomizingProduct).map((group) => (
                <div key={group.id} className="bg-muted/20 border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">{group.name}</span>
                    {group.is_required && (
                      <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {group.addons.map((addon) => {
                      const isSelected = !!selectedAddons[addon.id];
                      return (
                        <label
                          key={addon.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-xs select-none"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAddons((prev) => ({
                                    ...prev,
                                    [addon.id]: { id: addon.id, name: addon.name, price: addon.price, quantity: 1 },
                                  }));
                                } else {
                                  setSelectedAddons((prev) => {
                                    const next = { ...prev };
                                    delete next[addon.id];
                                    return next;
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="font-medium text-foreground">{addon.name}</span>
                          </div>
                          <span className="font-semibold text-muted-foreground">
                            +{currencySymbol}{addon.price}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Special Kitchen Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, no onion..."
                  value={itemInstructions}
                  onChange={(e) => setItemInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/20 border border-border rounded-xl text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={handleAddCustomizedItem}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                Add Item to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-card w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="font-bold text-base text-foreground">Your Dine-In Order</h3>
                <p className="text-xs text-muted-foreground">Table {menuData.table?.number}</p>
              </div>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Item rows */}
              <div className="divide-y divide-border/60">
                {cart.map((item) => {
                  let itemTotal = item.product.price;
                  for (const ad of item.addons) itemTotal += ad.price * (ad.quantity || 1);
                  itemTotal *= item.quantity;

                  return (
                    <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground">{item.product.name}</h4>
                        <p className="text-xs text-muted-foreground font-semibold">
                          {currencySymbol}{item.product.price}
                        </p>
                        {item.addons.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.addons.map((a) => (
                              <span
                                key={a.id}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium"
                              >
                                + {a.name} ({currencySymbol}{a.price})
                              </span>
                            ))}
                          </div>
                        )}
                        {item.special_instructions && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="px-2 py-1 bg-muted/40 hover:bg-muted transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 font-bold min-w-[20px] text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="px-2 py-1 bg-muted/40 hover:bg-muted transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="font-black text-sm text-foreground min-w-[50px] text-right">
                          {currencySymbol}{itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guest Details (Optional) */}
              <div className="bg-muted/20 border border-border rounded-xl p-3.5 space-y-2.5">
                <span className="font-bold text-xs text-foreground uppercase tracking-wider block">
                  Guest Info (Optional)
                </span>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="tel"
                  placeholder="Your Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="text"
                  placeholder="Overall Order Instructions..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Bill Summary */}
              <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes (Estimated)</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-black text-sm text-foreground">
                  <span>Estimated Total</span>
                  <span>{currencySymbol}{cartSubtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded-lg border border-orange-200 dark:border-orange-900/40">
                <Info size={14} className="text-orange-600 shrink-0" />
                <span>Payment is settled at the counter or with your server after your meal.</span>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20">
              <button
                type="button"
                disabled={placingOrder}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {placingOrder ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Sending to Waiter...</span>
                  </>
                ) : (
                  <span>Send Order to Waiter &bull; {currencySymbol}{cartSubtotal.toFixed(2)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Order Tracker Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="text-orange-600" size={20} />
                <h3 className="font-bold text-base text-foreground">Order Status Tracker</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {activeOrders.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No active orders found.</p>
              ) : (
                activeOrders.map((ord) => {
                  const isPending = ord.approval_status === 'pending_approval';
                  const isApproved = ord.approval_status === 'approved';
                  const isRejected = ord.approval_status === 'rejected';

                  return (
                    <div
                      key={ord.id}
                      className="border border-border rounded-xl p-3.5 bg-muted/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">Order #{ord.order_number}</span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {currencySymbol}{ord.total}
                        </span>
                      </div>

                      {/* Status Badges */}
                      {isPending && (
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 text-xs font-semibold animate-pulse">
                          <Clock size={16} className="shrink-0" />
                          <span>Waiting for Waiter to accept your order...</span>
                        </div>
                      )}

                      {isApproved && (
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold">
                          <Check size={16} className="shrink-0" />
                          <span>Order Accepted! Kitchen is preparing your food.</span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40 text-xs font-semibold">
                          <X size={16} className="shrink-0" />
                          <span>Order could not be accepted. Please talk to your server.</span>
                        </div>
                      )}

                      {/* Item list */}
                      <div className="bg-card rounded-lg p-2.5 border border-border/80 divide-y divide-border/60 text-xs">
                        {ord.items?.map((it, idx) => (
                          <div key={idx} className="py-1.5 flex justify-between">
                            <span className="text-foreground">
                              {it.quantity}x {it.product_name}
                            </span>
                            <span className="text-muted-foreground">{currencySymbol}{it.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex gap-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl font-bold text-xs shadow transition-colors"
              >
                Order More Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-neutral-500 font-medium">Opening Menu...</p>
        </div>
      }
    >
      <CustomerMenuContent />
    </Suspense>
  );
}
