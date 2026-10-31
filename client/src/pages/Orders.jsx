import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { getProductImage } from '../utils/productVisuals.js';

const STATUS_FILTERS = [
  { key: '', label: 'All Orders' },
  { key: 'placed', label: 'Placed' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STEPS = ['placed', 'packed', 'out_for_delivery', 'delivered'];

export default function Orders() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { showToast } = useApp();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 5 });
    if (statusFilter) params.set('status', statusFilter);

    api(`/orders/mine?${params}`)
      .then((res) => {
        if (Array.isArray(res)) {
          setData({ items: res, total: res.length, page: 1, pages: 1 });
        } else {
          setData(res);
        }
        setLoading(false);
      })
      .catch((e) => {
        showToast(e.message, 'error');
        setLoading(false);
      });
  }, [page, statusFilter, showToast]);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const getStepIndex = (status) => STEPS.indexOf(status);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111827' }}>
            My Orders
          </h2>
          <span className="hint" style={{ fontSize: 13 }}>
            Showing {data.items.length} of {data.total} {statusFilter ? `"${statusFilter.replace(/_/g, ' ')}"` : ''} orders (latest 5 per page)
          </span>
        </div>
      </div>

      {/* STATUS FILTER CHIPS */}
      <div className="categories-container" style={{ marginBottom: 20 }}>
        <div className="category-chips">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip ${statusFilter === f.key ? 'active' : ''}`}
              onClick={() => handleStatusChange(f.key)}
            >
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <p>Loading your orders...</p>
        </div>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16 }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>📦</div>
          <h3>{statusFilter ? `No ${statusFilter.replace(/_/g, ' ')} orders found` : 'No orders placed yet'}</h3>
          <p className="hint" style={{ maxWidth: 400, margin: '0 auto 20px' }}>
            {statusFilter
              ? 'Try selecting a different status filter to view other orders.'
              : 'When you place an order, it will appear here with live tracking in 10 minutes.'}
          </p>
          {statusFilter ? (
            <button className="btn-secondary" onClick={() => handleStatusChange('')}>
              View All Orders
            </button>
          ) : (
            <Link to="/" className="cart-btn" style={{ display: 'inline-flex' }}>
              Start Shopping
            </Link>
          )}
        </div>
      ) : (
        <>
          {data.items.map((o) => {
            const currentStep = getStepIndex(o.status);
            const isCancelled = o.status === 'cancelled';

            return (
              <div className="order-card" key={o._id}>
                <div className="order-header">
                  <div>
                    <span className="order-id">Order #{o._id.slice(-6).toUpperCase()}</span>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {new Date(o.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`order-status-badge ${o.status}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 }}>
                      ₹{o.total.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* PROGRESS TIMELINE (IF NOT CANCELLED) */}
                {!isCancelled && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: 10,
                      marginBottom: 16,
                      position: 'relative',
                    }}
                  >
                    {STEPS.map((s, idx) => {
                      const isDone = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      return (
                        <div
                          key={s}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            flex: 1,
                            position: 'relative',
                            zIndex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: isDone ? '#0c831f' : '#cbd5e1',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: isCurrent ? '2px solid #86efac' : 'none',
                            }}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: isCurrent ? 700 : 500,
                              color: isDone ? '#0c831f' : '#94a3b8',
                              textTransform: 'capitalize',
                            }}
                          >
                            {s.replace(/_/g, ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ITEMS LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {o.items.map((i) => {
                    const imgSrc = getProductImage({ name: i.name });
                    return (
                      <div
                        key={i.productId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 0',
                          borderBottom: '1px dashed #f1f5f9',
                        }}
                      >
                        <img
                          src={imgSrc}
                          alt={i.name}
                          style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', background: '#f8fafc' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            {i.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            ₹{i.price.toFixed(2)} × {i.qty}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          ₹{(i.price * i.qty).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ADDRESS FOOTER */}
                {o.address?.line1 && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>📍 Delivering to:</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {o.address.line1} {o.address.city ? `· ${o.address.city}` : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* PAGINATION BAR (LATEST 5 PER PAGE) */}
          {data.pages > 1 && (
            <div className="pagination-bar" style={{ marginTop: 24 }}>
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(p - 1, 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {page} of {data.pages}
              </span>
              <button
                className="page-btn"
                disabled={page >= data.pages}
                onClick={() => {
                  setPage((p) => Math.min(p + 1, data.pages));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
