import { Link, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Products from './pages/Products.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';
import Admin from './pages/Admin.jsx';
import ProfileMenu from './components/ProfileMenu.jsx';

function MainLayout() {
  const { user, cartCount, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    const wasAdmin = user?.role === 'admin';
    logout();
    if (wasAdmin) {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAdminLoginPage = location.pathname === '/admin/login';

  return (
    <>
      {/* CONDITIONAL HEADER BASED ON USER ROLE */}
      {isAdmin ? (
        // BACKOFFICE ADMIN TOPBAR (NO BROWSE, NO CART, NO ADD TO CART)
        <header className="app-header" style={{ borderBottom: '2px solid #0f766e' }}>
          <div className="nav-container">
            <Link to="/admin" className="brand-link">
              <span className="brand-logo" style={{ color: '#0f766e' }}>
                ⚡ Kwikr Backoffice
              </span>
              <span className="brand-badge" style={{ background: '#0f766e', color: '#fff' }}>
                Store Operations
              </span>
            </Link>

            <div className="spacer" />

            <div className="nav-links">
              <ProfileMenu isAdmin={true} onLogout={handleLogout} />
            </div>
          </div>
        </header>
      ) : !isAdminLoginPage ? (
        // CONSUMER STOREFRONT TOPBAR (NO ADMIN LINKS ANYWHERE)
        <header className="app-header">
          <div className="nav-container">
            <Link to="/" className="brand-link">
              {/* Lightning bolt SVG icon beside wordmark */}
              <span className="brand-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="13,2 5,13 11,13 9,20 17,9 11,9" fill="#f97316" />
                </svg>
              </span>
              <span className="brand-logo">Kwikr</span>
            </Link>

            <div className="spacer" />

            <nav className="nav-links">
              <Link to="/" className="nav-item">Browse Catalog</Link>
              {user && <Link to="/orders" className="nav-item">My Orders</Link>}

              <Link to="/cart" className="cart-btn">
                {/* White cart icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="6" x2="21" y2="6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 10a4 4 0 01-8 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Cart</span>
                {cartCount > 0 && <span className="cart-count-pill">{cartCount}</span>}
              </Link>

              {user ? (
                <ProfileMenu isAdmin={false} onLogout={handleLogout} />
              ) : (
                <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
                  Log in
                </Link>
              )}
            </nav>
          </div>
        </header>
      ) : null}

      <main>
        <Routes>
          {/* CUSTOMER ROUTES */}
          <Route
            path="/"
            element={isAdmin ? <Navigate to="/admin" replace /> : <Products />}
          />
          <Route
            path="/login"
            element={
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/cart"
            element={
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : !user ? (
                <Navigate to="/login" replace />
              ) : (
                <Cart />
              )
            }
          />
          <Route
            path="/orders"
            element={
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : !user ? (
                <Navigate to="/login" replace />
              ) : (
                <Orders />
              )
            }
          />

          {/* DEDICATED ADMIN ROUTES */}
          <Route
            path="/admin/login"
            element={
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <AdminLogin />
              )
            }
          />
          <Route
            path="/admin"
            element={
              !user ? (
                <Navigate to="/admin/login" replace />
              ) : !isAdmin ? (
                <Navigate to="/" replace />
              ) : (
                <Admin />
              )
            }
          />

          {/* CATCH ALL */}
          <Route
            path="*"
            element={<Navigate to={isAdmin ? '/admin' : '/'} replace />}
          />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
