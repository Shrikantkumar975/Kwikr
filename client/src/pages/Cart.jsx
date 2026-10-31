import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { getProductImage } from '../utils/productVisuals.js';

export default function Cart() {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [line1, setLine1] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { refreshCartCount, showToast } = useApp();
  const navigate = useNavigate();

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await api('/cart');
      setCart(data);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const updateQuantity = async (productId, newQty) => {
    try {
      let updated;
      if (newQty <= 0) {
        updated = await api(`/cart/items/${productId}`, { method: 'DELETE' });
        showToast('Item removed from cart', 'info');
      } else {
        updated = await api(`/cart/items/${productId}`, { method: 'PATCH', body: { qty: newQty } });
      }
      setCart(updated);
      await refreshCartCount();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const removeItem = async (productId) => {
    try {
      const updated = await api(`/cart/items/${productId}`, { method: 'DELETE' });
      setCart(updated);
      await refreshCartCount();
      showToast('Item removed from cart', 'info');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const items = cart.items || [];
  const itemsTotal = items.reduce((sum, i) => sum + (i.productId?.price || 0) * i.qty, 0);
  const handlingFee = items.length > 0 ? 2 : 0;
  const finalTotal = itemsTotal + handlingFee;

  const checkout = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const body = line1 ? { address: { label: 'Home', line1 } } : {};
      await api('/orders', { method: 'POST', body });
      await refreshCartCount();
      showToast('Order placed successfully! Delivering in 10 minutes ⚡', 'success');
      navigate('/orders');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        <p>Loading your cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16 }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>🛒</div>
        <h2>Your cart is empty</h2>
        <p className="hint" style={{ maxWidth: 400, margin: '0 auto 20px' }}>
          Explore our wide selection of fresh fruits, vegetables, dairy, snacks, and daily essentials.
        </p>
        <Link to="/" className="cart-btn" style={{ display: 'inline-flex' }}>
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 20px' }}>
        Review Cart ({items.reduce((s, i) => s + i.qty, 0)} items)
      </h2>

      <div className="cart-layout">
        {/* ITEMS LIST */}
        <div className="cart-items-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: '#0c831f', fontWeight: 700, fontSize: 13 }}>
            <span>⚡ Delivery in 10 mins</span>
          </div>

          {items.map((i) => {
            const product = i.productId;
            if (!product) return null;
            const itemTotal = (product.price * i.qty).toFixed(2);
            const imgSrc = getProductImage(product);

            return (
              <div className="cart-item-row" key={product._id}>
                <img src={imgSrc} alt={product.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <div className="cart-item-name">{product.name}</div>
                  <div className="hint" style={{ fontSize: 12, marginBottom: 4 }}>
                    {product.unit} · ₹{product.price.toFixed(2)} each
                  </div>
                  <button className="remove-link" onClick={() => removeItem(product._id)}>
                    Remove
                  </button>
                </div>

                <div className="stepper">
                  <button
                    className="stepper-btn"
                    onClick={() => updateQuantity(product._id, i.qty - 1)}
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="stepper-val">{i.qty}</span>
                  <button
                    className="stepper-btn"
                    onClick={() => updateQuantity(product._id, i.qty + 1)}
                    title="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <div style={{ minWidth: 70, textAlign: 'right', fontWeight: 700 }}>
                  ₹{itemTotal}
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY & CHECKOUT */}
        <div>
          <div className="cart-summary-card">
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              Bill Details
            </h3>

            <div className="bill-row">
              <span>Item Total</span>
              <span>₹{itemsTotal.toFixed(2)}</span>
            </div>
            <div className="bill-row">
              <span>Delivery Partner Fee</span>
              <span className="free-tag">FREE</span>
            </div>
            <div className="bill-row">
              <span>Handling Charge</span>
              <span>₹{handlingFee.toFixed(2)}</span>
            </div>

            <div className="bill-row total">
              <span>To Pay</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>

            <div className="address-box">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>
                📍 Delivery Address
              </label>
              <input
                className="address-input"
                placeholder="Leave blank to use default address, or enter street/apartment"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
              />
            </div>

            <button
              className="checkout-btn"
              disabled={submitting}
              onClick={checkout}
            >
              <span>{submitting ? 'Placing Order...' : `Place Order · ₹${finalTotal.toFixed(2)}`}</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span className="hint" style={{ fontSize: 11 }}>
                💵 Payment Mode: Cash on Delivery (COD)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
