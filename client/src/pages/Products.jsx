import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { CATEGORY_ICONS, getProductImage } from '../utils/productVisuals.js';

export default function Products() {
  const { user, getItemQty, addToCart, updateCartQty, removeFromCart, showToast } = useApp();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 12 });
    if (q) params.set('q', q);
    if (category) params.set('category', category);

    api(`/products?${params}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        showToast(e.message, 'error');
        setLoading(false);
      });
  }, [q, category, page, showToast]);

  const handleAdd = async (product) => {
    if (!user) {
      showToast('Please log in to add items to your cart', 'error');
      return;
    }
    setBusyId(product._id);
    await addToCart(product);
    setBusyId(null);
  };

  const handleIncrement = async (product) => {
    const currentQty = getItemQty(product._id);
    if (currentQty >= product.stock) {
      showToast(`Only ${product.stock} units available in stock`, 'warning');
      return;
    }
    setBusyId(product._id);
    await updateCartQty(product._id, currentQty + 1);
    setBusyId(null);
  };

  const handleDecrement = async (product) => {
    const currentQty = getItemQty(product._id);
    setBusyId(product._id);
    if (currentQty <= 1) {
      await removeFromCart(product._id, product.name);
    } else {
      await updateCartQty(product._id, currentQty - 1);
    }
    setBusyId(null);
  };

  const handleCategorySelect = (catId) => {
    setCategory(catId);
    setPage(1);
  };

  const clearSearch = () => {
    setQ('');
    setPage(1);
  };

  return (
    <>
      {/* HERO BANNER */}
      <div className="hero-banner">
        {/* Dot-matrix pattern overlay */}
        <div className="hero-dot-grid" aria-hidden="true" />

        {/* Left: copy */}
        <div className="hero-content">
          <span className="hero-tag">🛒 Your Daily Needs</span>
          <h1 className="hero-title">Fresh Groceries,<br />Delivered to Your Door.</h1>
          <p className="hero-sub">
            Skip the store. Stock up on fresh produce, daily dairy, and pantry essentials with ease.
          </p>
        </div>

        {/* Right: 3D grocery composition */}
        <div className="hero-visuals" aria-hidden="true">
          <div className="hero-grocery-scene">
            <span className="hg hg-apple">🍎</span>
            <span className="hg hg-milk">🥛</span>
            <span className="hg hg-bread">🍞</span>
            <span className="hg hg-veg">🥦</span>
            <span className="hg hg-egg">🥚</span>
          </div>
        </div>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="search-toolbar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search products, brands, or essentials..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          {q && (
            <button className="clear-search-btn" onClick={clearSearch} title="Clear search">
              ✕
            </button>
          )}
        </div>
        <div className="page-info">
          {data.total.toLocaleString()} products
        </div>
      </div>

      {/* CATEGORY CHIPS */}
      <div className="categories-container">
        <div className="category-chips">
          <button
            className={`chip ${category === '' ? 'active' : ''}`}
            onClick={() => handleCategorySelect('')}
          >
            <span className="chip-icon">🛍️</span>
            <span>All Products</span>
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              className={`chip ${category === c._id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(c._id)}
            >
              <span className="chip-icon">{CATEGORY_ICONS[c.name] || '📦'}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <p>Loading fresh products...</p>
        </div>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 14 }}>
          <h3>No products found</h3>
          <p className="hint">Try searching for something else or pick another category.</p>
          {(q || category) && (
            <button
              className="btn-secondary"
              onClick={() => {
                setQ('');
                setCategory('');
                setPage(1);
              }}
              style={{ marginTop: 12 }}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {data.items.map((p) => {
            const isOutOfStock = p.stock < 1;
            const isLowStock = p.stock > 0 && p.stock <= 5;
            const imgSrc = getProductImage(p);
            const cartQty = getItemQty(p._id);

            return (
              <div className="product-card" key={p._id}>
                <div className="product-image-container">
                  <img
                    src={imgSrc}
                    alt={p.name}
                    className="product-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="product-delivery-badge">
                    {/* <span>⚡ 10 MINS</span> */}
                  </div>
                  {isOutOfStock ? (
                    <span className="stock-tag out">Out of stock</span>
                  ) : isLowStock ? (
                    <span className="stock-tag low">Only {p.stock} left!</span>
                  ) : null}
                </div>

                <div className="product-details">
                  <span className="product-category-name">{p.categoryId?.name}</span>
                  <h3 className="product-name" title={p.name}>
                    {p.name}
                  </h3>
                  <span className="product-unit">{p.unit}</span>

                  <div className="product-footer">
                    <span className="product-price">₹{p.price.toFixed(2)}</span>

                    {/* DYNAMIC CART BUTTON: + ADD OR QUANTITY STEPPER BAR */}
                    {cartQty > 0 ? (
                      <div className="product-stepper">
                        <button
                          className="product-stepper-btn"
                          disabled={busyId === p._id}
                          onClick={() => handleDecrement(p)}
                          title={cartQty === 1 ? 'Remove from cart' : 'Decrease quantity'}
                        >
                          -
                        </button>
                        <span className="product-stepper-val">
                          {busyId === p._id ? '…' : cartQty}
                        </span>
                        <button
                          className="product-stepper-btn"
                          disabled={busyId === p._id || cartQty >= p.stock}
                          onClick={() => handleIncrement(p)}
                          title={cartQty >= p.stock ? 'Maximum available stock reached' : 'Increase quantity'}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-btn"
                        disabled={isOutOfStock || busyId === p._id}
                        onClick={() => handleAdd(p)}
                      >
                        {busyId === p._id ? 'Adding...' : isOutOfStock ? 'Sold Out' : '+ ADD'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {data.pages > 1 && (
        <div className="pagination-bar">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {page} of {data.pages}
          </span>
          <button
            className="page-btn"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => Math.min(p + 1, data.pages))}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
