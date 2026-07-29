import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import { db } from './firebase/config';

// User Pages
import Home from './Pages/Home';
import News from './Pages/News';
import CreatePost from './Pages/CreatePost';
import Report from './Pages/Report';
import Profile from './Pages/Profile';
import Chat from './Pages/Chat';
import Login from './Pages/Login';
import Register from './Pages/Register';
import SOS from "./Pages/SOS";

// Admin Layout & Pages
import AdminLayout from './components/Layout/AdminLayout';
import Dashboard from './Pages/admin/Dashboard';
import ManageUsers from './Pages/admin/ManageUsers';
import ManagePosts from './Pages/admin/ManagePosts';
import ManageReports from './Pages/admin/ManageReports';
import ManageChat from './Pages/admin/ManageChat';
import './Pages/Notifications.css';

const NOTIFICATION_ICONS = {
  sos_alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

const NO_CHROME_ROUTES = ['/register', '/login'];

function NotificationsPlaceholder() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('user_id', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => {
        const aTime = getDateValue(a.createdAt)?.getTime() ?? 0;
        const bTime = getDateValue(b.createdAt)?.getTime() ?? 0;
        return bTime - aTime;
      });
      setNotifications(items);
      setLoading(false);
    }, (error) => {
      console.error('Lỗi tải thông báo:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const getDateValue = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value?.toDate === 'function') {
      return value.toDate();
    }
    if (value instanceof Date) {
      return value;
    }
    return null;
  };

  const formatTime = (value) => {
    const date = getDateValue(value);
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return '';
    }
  };

  const handleDelete = async (notificationId) => {
    if (!notificationId) return;
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Lỗi xóa thông báo:', error);
    }
  };

  const TOGGLEABLE_TYPES = ['article_comment', 'comment_reply', 'article_like', 'article_favorite'];

  const visibleNotifications = notifications.filter((item) => {
    if (item.type && TOGGLEABLE_TYPES.includes(item.type)) {
      const settings = user?.notificationSettings || {};
      if (settings[item.type] === false) {
        return false;
      }
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="notifications-loading">
        <div className="notifications-wrapper">
          <header className="notifications-header">
            <h1 className="notifications-title">🔔 Thông báo</h1>
            <p className="notifications-subtitle">
              Theo dõi các cập nhật mới nhất về bài viết, báo cáo và tài khoản của bạn.
            </p>
          </header>
          <div className="notifications-card notifications-card--loading">
            <p>Đang tải thông báo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-wrapper">
        <header className="notifications-header">
          <h1 className="notifications-title">🔔 Thông báo</h1>
          <p className="notifications-subtitle">
            Theo dõi các cập nhật mới nhất về bài viết, báo cáo và tài khoản của bạn.
          </p>
        </header>

        <div className="notifications-stats">
          <div className="notifications-stat">
            <span className="notifications-stat-value">{visibleNotifications.length}</span>
            <span className="notifications-stat-label">Tổng thông báo</span>
          </div>
          <div className="notifications-stat notifications-stat--unread">
            <span className="notifications-stat-value">
              {visibleNotifications.filter((item) => item.read === false).length}
            </span>
            <span className="notifications-stat-label">Chưa đọc</span>
          </div>
          <div className="notifications-stat notifications-stat--read">
            <span className="notifications-stat-value">
              {visibleNotifications.filter((item) => item.read !== false).length}
            </span>
            <span className="notifications-stat-label">Đã đọc</span>
          </div>
        </div>

        <div className="notifications-toolbar">
          <div className="notifications-search">
            <svg className="notifications-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="notifications-search-input"
              placeholder="Tìm kiếm thông báo..."
              disabled
              aria-label="Tìm kiếm thông báo"
            />
          </div>
          <div className="notifications-filters" aria-hidden="true">
            <span className="notifications-filter notifications-filter--active">Tất cả</span>
            <span className="notifications-filter">Chưa đọc</span>
            <span className="notifications-filter">Đã đọc</span>
          </div>
        </div>

        <div className="notifications-card notifications-list-card">
          {visibleNotifications.length === 0 ? (
            <div className="notifications-empty">
              <p>Hiện chưa có thông báo nào cho tài khoản này.</p>
            </div>
          ) : (
            <ul className="notifications-list">
              {visibleNotifications.map((item) => {
                const isUnread = item.read === false;
                const isAlert = item.type === 'sos_alert';

                return (
                  <li
                    key={item.id}
                    className={`notifications-item${isUnread ? ' notifications-item--unread' : ''}`}
                  >
                    <div className={`notifications-item-icon${isAlert ? ' notifications-item-icon--alert' : ''}`}>
                      {NOTIFICATION_ICONS[isAlert ? 'sos_alert' : 'default']}
                    </div>
                    <div className="notifications-item-body">
                      <h3 className="notifications-item-title">{item.title || 'Thông báo mới'}</h3>
                      <p className="notifications-item-message">{item.message || 'Không có nội dung'}</p>
                      {item.createdAt && (
                        <div className="notifications-item-footer">
                          <span className="notifications-item-time">{formatTime(item.createdAt)}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="notifications-item-delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      Xóa
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsultationPlaceholder() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#1e3c72' }}>Đặt Lịch Tham Vấn</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '24px' }}>
          Đặt lịch trao đổi trực tiếp, bảo mật với các chuyên gia tâm lý học đường.
        </p>
      </div>
    </div>
  );
}

function AppShell() {
  const { pathname } = useLocation();

  const isNoChrome = NO_CHROME_ROUTES.includes(pathname) || pathname.startsWith('/admin');

  return (
    <>
      {!isNoChrome && <Header />}

      <main className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Public User Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/articles" element={<News />} />
          <Route path="/articles/:id" element={<News />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Trang SOS đã được gắn trực tiếp component SOS */}
          <Route path="/sos" element={<SOS />} />

          {/* Protected User Routes */}
          <Route path="/articles/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/articles/edit/:id" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

          {/* Placeholders */}
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPlaceholder /></ProtectedRoute>} />
          <Route path="/consultation" element={<ConsultationPlaceholder />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="posts" element={<ManagePosts />} />
            <Route path="reports" element={<ManageReports />} />
            <Route path="chat" element={<ManageChat />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isNoChrome && <Footer />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;