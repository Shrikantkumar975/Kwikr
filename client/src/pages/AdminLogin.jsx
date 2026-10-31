import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

export default function AdminLogin() {
  const { onAuth, showToast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api('/auth/admin/login', { method: 'POST', body: form });
      onAuth(data);
      navigate('/admin');
    } catch (err) {
      showToast(err.message || 'Access denied', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ maxWidth: 440, marginTop: 60 }}>
      <div className="auth-card" style={{ border: '1px solid #0f766e', boxShadow: '0 8px 30px rgba(15, 118, 110, 0.12)' }}>
        <div className="auth-header">
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
          <h2 className="auth-title" style={{ color: '#0f766e' }}>
            Kwikr Backoffice
          </h2>
          <p className="auth-subtitle">
            Store Operations & Inventory Management Portal
          </p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter admin email"
              value={form.email}
              onChange={setField('email')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter admin password"
              value={form.password}
              onChange={setField('password')}
              required
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            style={{ background: '#0f766e' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Portal'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
          ⚠️ Restricted area. Authorized personnel only.
        </div>
      </div>
    </div>
  );
}
