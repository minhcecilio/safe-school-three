import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Home from './Pages/Home';
import News from './Pages/News';
import Report from './Pages/Report';
import Profile from './Pages/Profile';
import Chat from './Pages/Chat';
import Login from './Pages/Login';
import Register from './Pages/Register';

// Routes that should NOT show the main Header/Footer chrome
const NO_CHROME_ROUTES = ['/register', '/login'];

function NotificationsPlaceholder() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Thông báo</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Xem các thông báo mới nhất từ ban giám hiệu và hệ thống Safe School.
        </p>
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', color: '#B45309', padding: '24px', borderRadius: 'var(--border-radius-md)', textAlign: 'left', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ marginBottom: '8px', color: '#92400E' }}>⚠️ Lưu ý hệ thống:</h3>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            Trang <strong>Thông báo (Route: /notifications)</strong> chưa được tạo trong dự án. Vui lòng bổ sung <code>src/Pages/Notifications.jsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConsultationPlaceholder() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Đặt Lịch Tham Vấn</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Đặt lịch trao đổi trực tiếp, bảo mật với các chuyên gia tâm lý học đường.
        </p>
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', color: '#B45309', padding: '24px', borderRadius: 'var(--border-radius-md)', textAlign: 'left', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ marginBottom: '8px', color: '#92400E' }}>⚠️ Lưu ý hệ thống:</h3>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            Trang <strong>Đặt lịch tham vấn (Route: /consultation)</strong> chưa được tạo trong dự án. Vui lòng bổ sung <code>src/Pages/Consultation.jsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Inner shell — reads current path to decide whether to show Header/Footer
function AppShell() {
  const { pathname } = useLocation();
  const showChrome = !NO_CHROME_ROUTES.includes(pathname);

  return (
    <>
      {showChrome && <Header />}

      <main className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/articles" element={<News />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/reports" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

          {/* Placeholders */}
          <Route path="/notifications" element={<NotificationsPlaceholder />} />
          <Route path="/consultation" element={<ConsultationPlaceholder />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showChrome && <Footer />}
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
