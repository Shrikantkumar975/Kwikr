import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { getProductImage } from '../utils/productVisuals.js';

const STATUSES = ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
const PIE_COLORS = [
  '#0c831f', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#64748b', '#10b981', '#3b82f6', '#eab308', '#a855f7',
  '#06b6d4', '#f43f5e', '#84cc16', '#6366f1'
];

export default function Admin() {
  const { showToast } = useApp();
  const [adminTab, setAdminTab] = useState('analytics'); // 'analytics' | 'inventory' | 'orders'

  // Summary stats & active DB
  const [summary, setSummary] = useState({
    activeDatabase: '',
    totalProducts: 0,
    totalCategories: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockCount: 0,
  });

  // Analytics data
  const [reports, setReports] = useState({
    topProducts: [],
    revenueByCategory: [],
    ordersPerDay: [],
    lowStock: [],
    avgOrderValue: [],
  });
  const [reportsLoading, setReportsLoading] = useState(true);

  // Orders management data
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('');

  // Products inventory management data
  const [products, setProducts] = useState([]);
  const [prodTotal, setProdTotal] = useState(0);
  const [prodPage, setProdPage] = useState(1);
  const [prodSearch, setProdSearch] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodLoading, setProdLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // Add Product form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    categoryId: '',
    price: '',
    stock: '50',
    unit: '1 pc',
  });
  const [creating, setCreating] = useState(false);

  // Load analytics reports
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const [summaryRes, prodRes, topProducts, revenueByCategory, ordersPerDay, lowStock, avgOrderValue] = await Promise.all([
        api('/reports/summary').catch(() => null),
        api('/products?limit=1').catch(() => null),
        api('/reports/top-products'),
        api('/reports/revenue-by-category'),
        api('/reports/orders-per-day'),
        api('/reports/low-stock'),
        api('/reports/avg-order-value'),
      ]);

      if (summaryRes) {
        setSummary(summaryRes);
        setProdTotal(summaryRes.totalProducts || (prodRes?.total ?? 0));
        setOrdersTotal(summaryRes.totalOrders || 0);
      } else if (prodRes && prodRes.total !== undefined) {
        setProdTotal(prodRes.total);
        setSummary((prev) => ({ ...prev, totalProducts: prodRes.total }));
      }

      setReports({
        topProducts: topProducts || [],
        revenueByCategory: revenueByCategory || [],
        // reverse ordersPerDay so oldest date is on left, newest on right for chart
        ordersPerDay: (ordersPerDay || []).slice().reverse(),
        lowStock: lowStock || [],
        avgOrderValue: avgOrderValue || [],
      });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setReportsLoading(false);
    }
  }, [showToast]);

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: ordersPage, limit: 10 });
      if (ordersStatusFilter) params.set('status', ordersStatusFilter);
      const data = await api(`/orders?${params}`);
      setOrders(data.items || []);
      setOrdersTotal(data.total || 0);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [ordersPage, ordersStatusFilter, showToast]);

  // Load products inventory
  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    try {
      const params = new URLSearchParams({ page: prodPage, limit: 10 });
      if (prodSearch) params.set('q', prodSearch);
      if (prodCat) params.set('category', prodCat);
      const data = await api(`/products?${params}`);
      setProducts(data.items || []);
      setProdTotal(data.total || 0);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProdLoading(false);
    }
  }, [prodPage, prodSearch, prodCat, showToast]);

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (adminTab === 'orders') loadOrders();
  }, [adminTab, loadOrders]);

  useEffect(() => {
    if (adminTab === 'inventory') loadProducts();
  }, [adminTab, loadProducts]);

  // Order status update
  const setOrderStatus = async (orderId, newStatus) => {
    try {
      await api(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: newStatus } });
      showToast(`Order status updated to "${newStatus}"`, 'success');
      loadOrders();
      loadReports(); // update inventory and revenue stats
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Create Product (POST)
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.categoryId || !newProd.price) {
      showToast('Name, Category, and Price are required', 'error');
      return;
    }
    setCreating(true);
    try {
      await api('/products', {
        method: 'POST',
        body: {
          name: newProd.name.trim(),
          categoryId: newProd.categoryId,
          price: Number(newProd.price),
          stock: Number(newProd.stock) || 0,
          unit: newProd.unit || '1 pc',
        },
      });
      showToast(`Created product "${newProd.name}"!`, 'success');
      setNewProd({ name: '', categoryId: '', price: '', stock: '50', unit: '1 pc' });
      setShowAddForm(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  // Quick Restock Product (PATCH /stock)
  const handleQuickRestock = async (productId, delta) => {
    try {
      await api(`/products/${productId}/stock`, {
        method: 'PATCH',
        body: { delta },
      });
      showToast(`Stock updated by ${delta > 0 ? '+' : ''}${delta}`, 'success');
      loadProducts();
      loadReports();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Delete Product (DELETE)
  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${productName}" from the catalog?`)) {
      return;
    }
    try {
      await api(`/products/${productId}`, { method: 'DELETE' });
      showToast(`Product "${productName}" deleted from catalog`, 'info');
      loadProducts();
      loadReports();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Calculate high-level summary figures
  const totalRevenue = reports.revenueByCategory.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalUnits = reports.topProducts.reduce((sum, p) => sum + (p.unitsSold || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* ADMIN CONSOLE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
              ⚡ Kwikr Backoffice
            </span>
            <span
              style={{
                background: '#0c831f',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: 0.5,
              }}
            >
              ADMIN
            </span>
            <span
              style={{
                background: '#0284c7',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: 0.3,
              }}
              title="Active MongoDB database loaded"
            >
              🗄️ DB: {summary.activeDatabase || 'kwikr-checkout'}
            </span>
          </div>
          <p className="hint" style={{ margin: '4px 0 0' }}>
            Live MongoDB Aggregation Analytics, Catalog CRUD Management & Order Fulfillment
          </p>
        </div>

        <button className="btn-secondary" onClick={loadReports} title="Refresh live aggregation data">
          🔄 Refresh Metrics
        </button>
      </div>

      {/* TOP KPI FIGURE CARDS */}
      <div className="admin-metrics" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-title">Aggregated Store Revenue</div>
          <div className="metric-val" style={{ color: '#0c831f' }}>
            ₹{(summary.totalRevenue || totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <span className="hint" style={{ fontSize: 11 }}>Calculated via $lookup & $group</span>
        </div>

        <div className="metric-card">
          <div className="metric-title">Total Products in Catalog</div>
          <div className="metric-val" style={{ color: '#0284c7' }}>
            {(summary.totalProducts || prodTotal || 0).toLocaleString()}
          </div>
          <span className="hint" style={{ fontSize: 11 }}>Flipkart Grocery & Catalog</span>
        </div>

        <div className="metric-card">
          <div className="metric-title">Low Stock Alerts</div>
          <div className="metric-val" style={{ color: (summary.lowStockCount || reports.lowStock.length) > 0 ? '#d97706' : '#10b981' }}>
            {summary.lowStockCount !== undefined ? summary.lowStockCount : reports.lowStock.length} items
          </div>
          <span className="hint" style={{ fontSize: 11 }}>Inventory threshold ≤ 120 units</span>
        </div>

        <div className="metric-card">
          <div className="metric-title">Active Categories</div>
          <div className="metric-val" style={{ color: '#8b5cf6' }}>
            {summary.totalCategories || categories.length}
          </div>
          <span className="hint" style={{ fontSize: 11 }}>Referenced Category Entities</span>
        </div>
      </div>

      {/* ADMIN PRIMARY NAVIGATION TABS */}
      <div className="admin-tabs" style={{ marginBottom: 24 }}>
        <button
          className={`admin-tab ${adminTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setAdminTab('analytics')}
        >
          📊 Analytics & Visual Charts
        </button>
        <button
          className={`admin-tab ${adminTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setAdminTab('inventory')}
        >
          📦 Product Inventory & Management (CRUD)
        </button>
        <button
          className={`admin-tab ${adminTab === 'orders' ? 'active' : ''}`}
          onClick={() => setAdminTab('orders')}
        >
          🚚 Order Fulfillment ({ordersTotal})
        </button>
      </div>

      {/* TAB 1: VISUAL CHARTS & AGGREGATION METRICS */}
      {adminTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {reportsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <p>Calculating aggregation pipelines in MongoDB...</p>
            </div>
          ) : (
            <>
              {/* ROW 1: TOP SELLING PRODUCTS & REVENUE BY CATEGORY */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
                {/* CHART 1: TOP SELLING PRODUCTS */}
                <div className="cart-items-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                        🏆 Top 10 Best Selling Products
                      </h3>
                      <span className="hint" style={{ fontSize: 11 }}>
                        Pipeline: <code>$match → $unwind → $group → $sort</code>
                      </span>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reports.topProducts}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11 }}
                          width={110}
                          tickFormatter={(val) => (val.length > 15 ? val.slice(0, 15) + '…' : val)}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            name === 'unitsSold' ? `${value} units` : `₹${Number(value).toLocaleString()}`,
                            name === 'unitsSold' ? 'Units Sold' : 'Revenue',
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="unitsSold" name="Units Sold" fill="#0c831f" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CHART 2: REVENUE BY CATEGORY (DONUT / BAR) */}
                <div className="cart-items-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                        📊 Revenue Distribution by Category
                      </h3>
                      <span className="hint" style={{ fontSize: 11 }}>
                        Pipeline: <code>Double $lookup (orders → products → categories)</code>
                      </span>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reports.revenueByCategory}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={3}
                        >
                          {reports.revenueByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                        <Legend
                          wrapperStyle={{ fontSize: 11 }}
                          formatter={(val) => <span style={{ color: '#334155' }}>{val}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ROW 2: 30-DAY ORDERS & REVENUE TREND */}
              <div className="cart-items-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                      📈 30-Day Daily Order Volume & Revenue Trend
                    </h3>
                    <span className="hint" style={{ fontSize: 11 }}>
                      Pipeline: <code>$group with $dateToString format: %Y-%m-%d</code>
                    </span>
                  </div>
                </div>

                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={reports.ordersPerDay}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="orderColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0c831f" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0c831f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(d) => d.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val, name) => [
                          name === 'orders' ? `${val} orders` : `₹${Number(val).toLocaleString()}`,
                          name === 'orders' ? 'Orders Placed' : 'Daily Revenue',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="#0c831f"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#orderColor)"
                        name="Orders Placed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ROW 3: LOW STOCK INVENTORY & CUSTOMER LIFETIME VALUE */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
                {/* LOW STOCK TABLE */}
                <div className="cart-items-card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: '#b45309' }}>
                    ⚠️ Low Stock Inventory Warning (≤ 120 Units)
                  </h3>
                  <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Units Left</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.lowStock.slice(0, 8).map((p, idx) => (
                          <tr key={idx}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.category}</td>
                            <td>
                              <span
                                style={{
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                {p.stock} units
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-secondary"
                                style={{ padding: '2px 8px', fontSize: 11 }}
                                onClick={() => {
                                  setAdminTab('inventory');
                                  setProdSearch(p.name);
                                }}
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CUSTOMER LIFETIME VALUE */}
                <div className="cart-items-card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>
                    👥 Highest Average Order Value by Customer
                  </h3>
                  <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Customer</th>
                          <th>Total Orders</th>
                          <th>Avg Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.avgOrderValue.slice(0, 8).map((u, idx) => (
                          <tr key={idx}>
                            <td>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</td>
                            <td><strong>{u.customer}</strong></td>
                            <td>{u.orders} orders</td>
                            <td style={{ color: '#0c831f', fontWeight: 800 }}>
                              ₹{u.avgOrderValue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCT INVENTORY & MANAGEMENT (INSERT, RESTOCK, DELETE) */}
      {adminTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* HEADER ACTION BAR */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              padding: 16,
              borderRadius: 14,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280 }}>
              <input
                className="form-input"
                placeholder="Search catalog by name or tag (MongoDB $text index)..."
                value={prodSearch}
                onChange={(e) => {
                  setProdSearch(e.target.value);
                  setProdPage(1);
                }}
              />
              <select
                className="form-input"
                style={{ width: 'auto' }}
                value={prodCat}
                onChange={(e) => {
                  setProdCat(e.target.value);
                  setProdPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="submit-btn"
              style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <span>{showAddForm ? '✕ Close Form' : '➕ Add New Product'}</span>
            </button>
          </div>

          {/* ADD PRODUCT FORM (COLLAPSIBLE) */}
          {showAddForm && (
            <div className="cart-items-card" style={{ border: '2px solid #0c831f' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: '#0c831f' }}>
                ➕ Insert New Product Document into MongoDB
              </h3>
              <form
                onSubmit={handleCreateProduct}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                  alignItems: 'end',
                }}
              >
                <div>
                  <label className="form-label">Product Name *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Tata Sampann Moong Dal 1kg"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={newProd.categoryId}
                    onChange={(e) => setNewProd({ ...newProd, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="99.00"
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Initial Stock *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="50"
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Unit / Size</label>
                  <input
                    className="form-input"
                    placeholder="e.g. 500 g, 1 kg, 1 L"
                    value={newProd.unit}
                    onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                  />
                </div>

                <div>
                  <button type="submit" className="submit-btn" disabled={creating}>
                    {creating ? 'Saving to DB...' : 'Save Product Document'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PRODUCT INVENTORY TABLE */}
          <div className="cart-items-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
                Showing {products.length} of {prodTotal.toLocaleString()} products
              </span>
              <span className="hint" style={{ fontSize: 12 }}>
                Uses compound index <code>{'{ categoryId: 1, price: 1 }'}</code>
              </span>
            </div>

            {prodLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                Searching MongoDB database...
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                No products found matching your filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock Level</th>
                      <th>Quick Restock</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isLow = p.stock <= 10;
                      const isOut = p.stock === 0;
                      const imgSrc = getProductImage(p);

                      return (
                        <tr key={p._id}>
                          <td style={{ width: 50 }}>
                            <img
                              src={imgSrc}
                              alt={p.name}
                              style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                            />
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                              {p.sku && (
                                <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>
                                  {p.sku}
                                </span>
                              )}
                              <span className="hint" style={{ fontSize: 11 }}>{p.unit}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{ fontSize: 11 }}>
                              {p.categoryId?.name || 'Category'}
                            </span>
                          </td>
                          <td>
                            <strong>₹{p.price.toFixed(2)}</strong>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
                                color: isOut ? '#991b1b' : isLow ? '#92400e' : '#15803d',
                              }}
                            >
                              {p.stock} units
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '2px 6px', fontSize: 11 }}
                                onClick={() => handleQuickRestock(p._id, 10)}
                                title="Add 10 units"
                              >
                                +10
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '2px 6px', fontSize: 11 }}
                                onClick={() => handleQuickRestock(p._id, 50)}
                                title="Add 50 units"
                              >
                                +50
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              onClick={() => handleDeleteProduct(p._id, p.name)}
                              title="Delete product document from MongoDB"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            <div className="pagination-bar" style={{ marginTop: 18 }}>
              <button
                className="page-btn"
                disabled={prodPage <= 1}
                onClick={() => setProdPage((p) => Math.max(p - 1, 1))}
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {prodPage} of {Math.max(1, Math.ceil(prodTotal / 10))}
              </span>
              <button
                className="page-btn"
                disabled={prodPage >= Math.ceil(prodTotal / 10)}
                onClick={() => setProdPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORDER FULFILLMENT */}
      {adminTab === 'orders' && (
        <div className="cart-items-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                🚚 Customer Order Pipeline & Fulfillment
              </h3>
              <span className="hint" style={{ fontSize: 12 }}>
                Orders update stock atomically; cancelling restores inventory via <code>Product.bulkWrite</code>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="form-input"
                style={{ width: 'auto', fontSize: 12 }}
                value={ordersStatusFilter}
                onChange={(e) => {
                  setOrdersStatusFilter(e.target.value);
                  setOrdersPage(1);
                }}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <button className="btn-secondary" onClick={loadOrders}>
                Refresh
              </button>
            </div>
          </div>

          {orders.length === 0 ? (
            <p className="hint">No orders found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Change Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <code>#{o._id.slice(-6).toUpperCase()}</code>
                      </td>
                      <td>
                        <strong>{o.userId?.name || 'Customer'}</strong>
                        <div className="hint" style={{ fontSize: 11 }}>{o.userId?.email}</div>
                      </td>
                      <td>
                        <span className="hint" style={{ fontSize: 12 }}>
                          {o.items?.length || 0} items
                        </span>
                      </td>
                      <td>
                        <strong>₹{o.total?.toFixed(2)}</strong>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(o.createdAt).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        <span className={`order-status-badge ${o.status}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                          value={o.status}
                          disabled={o.status === 'cancelled' || o.status === 'delivered'}
                          onChange={(e) => setOrderStatus(o._id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ORDERS PAGINATION */}
          <div className="pagination-bar" style={{ marginTop: 18 }}>
            <button
              className="page-btn"
              disabled={ordersPage <= 1}
              onClick={() => setOrdersPage((p) => Math.max(p - 1, 1))}
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {ordersPage} of {Math.max(1, Math.ceil(ordersTotal / 10))}
            </span>
            <button
              className="page-btn"
              disabled={ordersPage >= Math.ceil(ordersTotal / 10)}
              onClick={() => setOrdersPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
