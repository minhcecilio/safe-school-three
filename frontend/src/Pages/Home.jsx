import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const stats = [
  { id: 1, count: '120+',   label: 'Tổng bài viết',      icon: '📝', color: '#2563EB' },
  { id: 2, count: '342',    label: 'Báo cáo đã xử lý',   icon: '🛡️', color: '#10B981' },
  { id: 3, count: '15',     label: 'Chuyên gia tư vấn',  icon: '👨‍⚕️', color: '#F59E0B' },
  { id: 4, count: '2,500+', label: 'Người dùng active',  icon: '👥', color: '#6366F1' },
];

const features = [
  {
    id: 'articles',
    title: 'Bài viết kiến thức',
    desc: 'Tìm hiểu kiến thức về phòng chống bạo lực học đường, kỹ năng ứng phó và bảo vệ bản thân.',
    route: '/articles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'reports',
    title: 'Báo cáo bảo mật',
    desc: 'Gửi phản ánh nhanh chóng, bảo mật về các hành vi bạo lực, bắt nạt hoặc không an toàn.',
    route: '/reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'consultation',
    title: 'Đặt lịch tham vấn',
    desc: 'Đặt lịch hẹn trao đổi trực tiếp với các chuyên gia tâm lý học đường giàu kinh nghiệm.',
    route: '/consultation',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14c1.105 0 2-.895 2-2V7c0-1.105-.895-2-2-2H5c-1.105 0-2 .895-2 2v12c0 1.105.895 2 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'chat',
    title: 'Hỗ trợ trò chuyện',
    desc: 'Kênh chat trực tuyến bảo mật tuyệt đối 1-1 với tư vấn viên hỗ trợ khẩn cấp.',
    route: '/chat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'notifications',
    title: 'Hộp thư thông báo',
    desc: 'Nhận tin tức mới nhất, cảnh báo an toàn học đường và lịch trình hoạt động của hệ thống.',
    route: '/notifications',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const articles = [
  {
    id: 1,
    title: 'Kỹ năng phòng chống bạo lực học đường cho học sinh THCS',
    desc: 'Làm thế nào để nhận biết dấu hiệu bạo lực học đường và những kỹ năng mềm giúp học sinh tự bảo vệ bản thân và bạn bè xung quanh hiệu quả.',
    author: 'PGS. TS. Nguyễn Thanh Hà',
    date: '18/07/2026',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 2,
    title: 'Ứng phó thế nào khi phát hiện bắt nạt trên không gian mạng?',
    desc: 'Hướng dẫn chi tiết từng bước xử lý thông tin, lưu lại bằng chứng và tìm kiếm sự trợ giúp đúng nơi khi bạn hoặc người thân bị quấy rối mạng xã hội.',
    author: 'ThS. Lê Minh Trang',
    date: '15/07/2026',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 3,
    title: 'Vai trò của gia đình trong việc đồng hành cùng tâm lý học đường',
    desc: 'Sự phối hợp chặt chẽ giữa phụ huynh và nhà trường là chìa khóa tháo gỡ những vướng mắc tâm lý tuổi dậy thì, xây dựng môi trường phát triển lành mạnh.',
    author: 'TS. Trần Văn Hùng',
    date: '10/07/2026',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="home-page fade-in">

      {/* ── 1. HERO ── */}
      <section className="hero-section">
        <div className="container hero-container">

          <div className="hero-content">
            <span className="hero-badge">🛡️ Lá chắn an toàn cho tương lai học đường</span>

            <h1 className="hero-title">
              Vì Một Môi Trường Học Đường <br />
              <span className="gradient-text">An Toàn &amp; Lành Mạnh</span>
            </h1>

            <p className="hero-description">
              Safe School đồng hành cùng học sinh, phụ huynh và nhà trường trong việc phòng chống
              bạo lực học đường, cung cấp kiến thức bảo vệ bản thân và kênh kết nối nhanh chóng
              với các chuyên gia tâm lý học.
            </p>

            {user && (
              <div className="hero-user-bar">
                <span className="hero-user-greeting">
                  👋 Xin chào, <strong>{user.displayName || user.email}</strong>
                </span>
                <button className="hero-logout-btn" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            )}

            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/articles')}>
                Khám phá bài viết
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {user ? (
                <button className="btn btn-secondary" onClick={() => navigate('/consultation')}>
                  Đặt lịch tham vấn
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => navigate('/login')}>
                  Đăng nhập để bắt đầu
                </button>
              )}
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-badge-floating">
                <span className="status-dot"></span> Đang hoạt động bảo mật
              </div>
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                alt="Safe School Community"
                className="hero-image"
              />
              <div className="glass-stats-card">
                <div className="avatar-group">
                  <span className="avatar">👩‍🏫</span>
                  <span className="avatar">👨‍⚕️</span>
                  <span className="avatar">🧑‍🎓</span>
                </div>
                <div>
                  <p className="glass-title">Chuyên gia túc trực</p>
                  <p className="glass-subtitle">Hỗ trợ 24/7 hoàn toàn ẩn danh</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. STATS ── */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {stats.map((item) => (
              <div key={item.id} className="stat-card">
                <div className="stat-icon-wrapper" style={{ backgroundColor: `${item.color}15` }}>
                  <span className="stat-icon" style={{ color: item.color }}>{item.icon}</span>
                </div>
                <div className="stat-info">
                  <h3 className="stat-number">{item.count}</h3>
                  <p className="stat-label">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES ── */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Chức Năng Nổi Bật</h2>
            <p className="section-subtitle">
              Cung cấp các công cụ và tài nguyên tối ưu giúp quản lý, tiếp cận thông tin an toàn học đường dễ dàng.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feat) => (
              <div key={feat.id} className="feature-card" onClick={() => navigate(feat.route)}>
                <div className="feature-icon-box">{feat.icon}</div>
                <h3 className="feature-card-title">{feat.title}</h3>
                <p className="feature-card-desc">{feat.desc}</p>
                <div className="feature-card-action">
                  <span>Trải nghiệm ngay</span>
                  <svg className="action-arrow" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. ARTICLES ── */}
      <section className="articles-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Bài Viết Nổi Bật</h2>
            <p className="section-subtitle">
              Cập nhật kiến thức bổ ích và những kỹ năng sống quan trọng từ đội ngũ chuyên gia hàng đầu.
            </p>
          </div>

          <div className="articles-grid">
            {articles.map((art) => (
              <article key={art.id} className="article-card">
                <div className="article-image-wrapper">
                  <img src={art.image} alt={art.title} className="article-image" />
                  <span className="article-category">Kỹ năng</span>
                </div>
                <div className="article-body">
                  <div className="article-meta">
                    <span className="article-author">👤 {art.author}</span>
                    <span className="article-date">📅 {art.date}</span>
                  </div>
                  <h3 className="article-card-title">{art.title}</h3>
                  <p className="article-card-desc">{art.desc}</p>
                  <button className="article-btn-more" onClick={() => navigate('/articles')}>
                    Xem thêm
                    <svg className="arrow-icon" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CTA BANNER ── */}
      <section className="cta-banner-section">
        <div className="container">
          <div className="cta-banner-card">
            <div className="cta-banner-content">
              <h2 className="cta-title">Bạn Đang Gặp Vấn Đề Khó Khăn Cần Giúp Đỡ?</h2>
              <p className="cta-desc">
                Đừng im lặng. Hãy chia sẻ với Safe School hoặc kết nối trực tiếp với Tổng đài
                Quốc gia Bảo vệ Trẻ em để nhận được sự trợ giúp bảo mật, kịp thời nhất.
              </p>
            </div>
            <div className="cta-banner-actions">
              <button className="btn btn-danger" onClick={() => navigate('/reports')}>
                🚨 Gửi báo cáo khẩn cấp
              </button>
              <a href="tel:111" className="btn btn-secondary-white">
                📞 Gọi Tổng đài 111 (Miễn phí)
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}