import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Home from './Pages/Home';
import News from './Pages/News';
import Report from './Pages/Report';
import Profile from './Pages/Profile';
import Chat from './Pages/Chat';

// Notification route placeholder component
function NotificationsPlaceholder() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Thông báo</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Xem các thông báo mới nhất từ ban giám hiệu và hệ thống Safe School.
        </p>
        <div style={{ 
          backgroundColor: '#FFFBEB', 
          border: '1px solid #FEF3C7', 
          color: '#B45309', 
          padding: '24px', 
          borderRadius: 'var(--border-radius-md)', 
          textAlign: 'left',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Lưu ý hệ thống:
          </h3>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            Trang <strong>Thông báo (Route: /notifications)</strong> chưa được tạo trong danh sách file nguồn của dự án. 
            Quản trị viên vui lòng bổ sung file <code>src/Pages/Notifications.jsx</code> để liên kết hiển thị đầy đủ.
          </p>
        </div>
      </div>
    </div>
  );
}

// Consultation route placeholder component
function ConsultationPlaceholder() {
  return (
    <div style={{ padding: '120px 24px 80px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Đặt Lịch Tham Vấn</h1>
        <p style={{ color: 'var(--gray-text)', fontSize: '1.1rem', marginBottom: '24px' }}>
          Đặt lịch trao đổi trực tiếp, bảo mật với các chuyên gia tâm lý học đường.
        </p>
        <div style={{ 
          backgroundColor: '#FFFBEB', 
          border: '1px solid #FEF3C7', 
          color: '#B45309', 
          padding: '24px', 
          borderRadius: 'var(--border-radius-md)', 
          textAlign: 'left',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Lưu ý hệ thống:
          </h3>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            Trang <strong>Đặt lịch tham vấn (Route: /consultation)</strong> chưa được tạo trong danh sách file nguồn của dự án. 
            Quản trị viên vui lòng bổ sung file <code>src/Pages/Consultation.jsx</code> để liên kết hiển thị đầy đủ.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Header component remains sticky across pages */}
      <Header />
      
      {/* Main content wrapper */}
      <main className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/articles" element={<News />} />
          <Route path="/reports" element={<Report />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notifications" element={<NotificationsPlaceholder />} />
          <Route path="/consultation" element={<ConsultationPlaceholder />} />
          
          {/* Catch-all redirects to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer component */}
      <Footer />
    </BrowserRouter>
  );
}

export default App;
