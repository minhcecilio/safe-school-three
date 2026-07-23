import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

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
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#1e3c72' }}>Thông báo</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '24px' }}>
          Xem các thông báo mới nhất từ ban giám hiệu và hệ thống SafeSchool.
        </p>
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
          <Route path="/notifications" element={<NotificationsPlaceholder />} />
          <Route path="/consultation" element={<ConsultationPlaceholder />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
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
