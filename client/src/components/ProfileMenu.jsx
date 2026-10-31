import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function ProfileMenu({ isAdmin = false, onLogout }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initial = (user.name || user.email || 'U')[0].toUpperCase();
  const bgGradient = isAdmin
    ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)'
    : 'linear-gradient(135deg, #0c831f 0%, #16a34a 100%)';

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      {/* PROFILE CIRCLE BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: bgGradient,
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #ffffff',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title={`Account: ${user.name}`}
      >
        {initial}
      </button>

      {/* DROPDOWN MENU */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 250,
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* USER INFO HEADER */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: bgGradient,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initial}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: isAdmin ? '#ccfbf1' : '#dcfce7',
                  color: isAdmin ? '#0f766e' : '#15803d',
                }}
              >
                {isAdmin ? '⚙️ Store Administrator' : '👤 Customer Account'}
              </span>
            </div>
          </div>

          {/* MENU ITEMS */}
          <div style={{ padding: '8px 0' }}>
            {!isAdmin ? (
              <>
                <Link
                  to="/orders"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    textDecoration: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>📦</span>
                  <span>My Orders</span>
                </Link>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  <span>📍</span>
                  <span>Kapurthala . 144401</span>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                <span>⚡</span>
                <span>Operations Backoffice</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0' }} />

            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
