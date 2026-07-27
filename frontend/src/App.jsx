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

// Admin Layout & Pages
import AdminLayout from './components/Layout/AdminLayout';
import Dashboard from './Pages/admin/Dashboard';
import ManageUsers from './Pages/admin/ManageUsers';
import ManagePosts from './Pages/admin/ManagePosts';
import ManageReports from './Pages/admin/ManageReports';
import ManageChat from './Pages/admin/ManageChat';

// Routes that should NOT show the main public Header/Footer chrome
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
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setNotifications(items);
      setLoading(false);
    }, (error) => {
      console.error('Lỗi tải thông báo:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const formatTime = (value) => {
    if (!value) return '';
    try {
      const date = typeof value === 'string' ? new Date(value) : value.toDate ? value.toDate() : new Date(value);
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

  if (authLoading || loading) {
    return (
      <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>Đang tải thông báo...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '8px', color: '#1e3c72' }}>Thông báo</h1>
        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '24px' }}>
          Xem các thông báo mới nhất từ ban giám hiệu và hệ thống SafeSchool.
        </p>

        {notifications.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
            <p style={{ margin: 0, color: '#64748b' }}>Hiện chưa có thông báo nào cho tài khoản này.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {notifications.map((item) => (
              <div key={item.id} style={{ background: '#fff', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1rem' }}>{item.title || 'Thông báo mới'}</h3>
                    <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{item.message || 'Không có nội dung'}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.createdAt && (
                      <span style={{ color: '#64748b', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatTime(item.createdAt)}</span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', padding: '6px 10px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

// Inner shell — reads current path to decide whether to show public Header/Footer
function AppShell() {
  const { pathname } = useLocation();

  // Không hiển thị Header/Footer công khai nếu ở trang đăng nhập, đăng ký hoặc trong Admin Panel
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

          {/* Protected User Routes */}
          <Route path="/articles/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/articles/edit/:id" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

          {/* Placeholders */}
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPlaceholder /></ProtectedRoute>} />
          <Route path="/consultation" element={<ConsultationPlaceholder />} />

          {/* Protected Admin Routes — only moderator roles (admin, teacher, expert…) */}
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
