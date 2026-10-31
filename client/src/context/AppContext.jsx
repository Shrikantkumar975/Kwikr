import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const [cartItems, setCartItems] = useState({}); // { [productId]: qty }
  const [cartCount, setCartCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Sync cartItems map and total count from server cart data
  const syncCartData = useCallback((data) => {
    const map = {};
    let count = 0;
    (data?.items || []).forEach((item) => {
      const pid = item.productId?._id || item.productId;
      if (pid) {
        map[pid] = item.qty;
        count += item.qty;
      }
    });
    setCartItems(map);
    setCartCount(count);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!localStorage.getItem('token') || user?.role === 'admin') {
      setCartItems({});
      setCartCount(0);
      return;
    }
    try {
      const data = await api('/cart');
      syncCartData(data);
    } catch {
      // Ignored if user not logged in
    }
  }, [user, syncCartData]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      refreshCart();
    } else {
      setCartItems({});
      setCartCount(0);
    }
  }, [user, refreshCart]);

  const getItemQty = useCallback(
    (productId) => {
      return cartItems[productId] || 0;
    },
    [cartItems]
  );

  const addToCart = useCallback(
    async (product) => {
      if (!user) {
        showToast('Please log in to add items to your cart', 'error');
        return false;
      }
      try {
        const data = await api('/cart/items', {
          method: 'POST',
          body: { productId: product._id, qty: 1 },
        });
        syncCartData(data);
        showToast(`Added ${product.name} to cart!`, 'success');
        return true;
      } catch (e) {
        showToast(e.message, 'error');
        return false;
      }
    },
    [user, showToast, syncCartData]
  );

  const updateCartQty = useCallback(
    async (productId, newQty, productName) => {
      try {
        let data;
        if (newQty <= 0) {
          data = await api(`/cart/items/${productId}`, { method: 'DELETE' });
          if (productName) showToast(`Removed ${productName} from cart`, 'info');
        } else {
          data = await api(`/cart/items/${productId}`, {
            method: 'PATCH',
            body: { qty: newQty },
          });
        }
        syncCartData(data);
        return true;
      } catch (e) {
        showToast(e.message, 'error');
        return false;
      }
    },
    [showToast, syncCartData]
  );

  const removeFromCart = useCallback(
    async (productId, productName) => {
      try {
        const data = await api(`/cart/items/${productId}`, { method: 'DELETE' });
        syncCartData(data);
        if (productName) showToast(`Removed ${productName} from cart`, 'info');
        return true;
      } catch (e) {
        showToast(e.message, 'error');
        return false;
      }
    },
    [showToast, syncCartData]
  );

  const onAuth = (authData) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    setUser(authData.user);
    showToast(`Welcome back, ${authData.user.name}!`, 'success');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCartItems({});
    setCartCount(0);
    showToast('Logged out successfully', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        cartItems,
        cartCount,
        getItemQty,
        addToCart,
        updateCartQty,
        removeFromCart,
        refreshCart,
        refreshCartCount: refreshCart,
        showToast,
        onAuth,
        logout,
      }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
