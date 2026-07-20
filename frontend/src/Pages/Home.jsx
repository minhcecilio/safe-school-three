import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import styles from './Home.module.css';

const menuItems = [
    { icon: '🏠', label: 'Tổng quan', to: '/', active: true },
    { icon: '📰', label: 'Tin tức', to: '/news' },
    { icon: '💬', label: 'Tham vấn', to: '/consultation' },
    { icon: '📋', label: 'Báo cáo', to: '/reports' },
    { icon: '🚨', label: 'SOS', to: '/sos', danger: true },
    { icon: '👤', label: 'Hồ sơ', to: '/profile' },
];

const quickActions = [
    { icon: '✍️', title: 'Viết bài', description: 'Chia sẻ câu chuyện và điều tích cực', to: '/posts/new' },
    { icon: '📰', title: 'Tin tức', description: 'Cập nhật kiến thức an toàn học đường', to: '/news' },
    { icon: '💬', title: 'Tham vấn', description: 'Kết nối chuyên gia để được hỗ trợ', to: '/consultation' },
    { icon: '🚨', title: 'SOS', description: 'Gửi yêu cầu trợ giúp khẩn cấp', to: '/sos', danger: true },
];

const mockPosts = [
    {
        id: 1,
        author: 'Ban tư vấn SafeSchool',
        avatar: 'BT',
        time: '10 phút trước',
        title: '5 dấu hiệu nhận biết bạo lực học đường',
        content: 'Nhận biết sớm những thay đổi về cảm xúc, hành vi và kết quả học tập giúp gia đình, nhà trường hỗ trợ học sinh kịp thời.',
        category: 'Kỹ năng an toàn',
    },
    {
        id: 2,
        author: 'Nguyễn Minh Anh',
        avatar: 'MA',
        time: '1 giờ trước',
        title: 'Hãy lên tiếng khi bạn cần được giúp đỡ',
        content: 'Tìm đến giáo viên, phụ huynh hoặc chuyên gia đáng tin cậy là một hành động dũng cảm, không phải sự yếu đuối.',
        category: 'Chia sẻ',
    },
    {
        id: 3,
        author: 'Chuyên gia tâm lý',
        avatar: 'TL',
        time: 'Hôm qua',
        title: 'Cách hỗ trợ một người bạn đang bị bắt nạt',
        content: 'Lắng nghe không phán xét, không lan truyền câu chuyện và cùng bạn tìm người lớn đáng tin cậy để được hỗ trợ.',
        category: 'Tham vấn',
    },
];

const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    const displayName = user?.displayName || user?.email?.split('@')[0] || 'Bạn';
    const avatarText = displayName.trim().charAt(0).toUpperCase();

    const handleLogout = async () => {
        setLogoutError('');
        try {
            await signOut(auth);
            navigate('/login');
        } catch {
            setLogoutError('Không thể đăng xuất lúc này. Vui lòng thử lại.');
        }
    };

    if (!user) {
        return (
            <main className={styles.guestPage}>
                <section className={styles.guestCard}>
                    <div className={styles.guestLogo}>🛡️ SafeSchool</div>
                    <h1>Không gian học đường an toàn</h1>
                    <p>Đăng nhập để kết nối, chia sẻ và nhận hỗ trợ từ cộng đồng SafeSchool.</p>
                    <div className={styles.guestActions}>
                        <Link to="/login" className={styles.primaryLink}>Đăng nhập</Link>
                        <Link to="/register" className={styles.secondaryLink}>Đăng ký</Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <div className={styles.appShell}>
            {mobileOpen && (
                <button
                    className={styles.overlay}
                    aria-label="Đóng menu"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
                <div className={styles.sidebarTop}>
                    <Link to="/" className={styles.logo} onClick={() => setMobileOpen(false)}>
                        <span className={styles.logoIcon}>🛡️</span>
                        <span className={styles.logoText}>SafeSchool</span>
                    </Link>
                    <button
                        type="button"
                        className={styles.collapseButton}
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                <nav className={styles.nav} aria-label="Điều hướng chính">
                    {menuItems.map((item) => (
                        <Link
                            key={item.label}
                            to={item.to}
                            className={`${styles.navItem} ${item.active ? styles.active : ''} ${item.danger ? styles.dangerItem : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                    <span className={styles.navIcon}>🚪</span>
                    <span className={styles.navLabel}>Đăng xuất</span>
                </button>
            </aside>

            <div className={styles.mainColumn}>
                <header className={styles.header}>
                    <div className={styles.headerTitleWrap}>
                        <button
                            type="button"
                            className={styles.mobileMenuButton}
                            onClick={() => setMobileOpen(true)}
                            aria-label="Mở menu"
                        >
                            ☰
                        </button>
                        <div>
                            <p className={styles.eyebrow}>SafeSchool</p>
                            <h1 className={styles.pageTitle}>Tổng quan</h1>
                        </div>
                    </div>

                    <div className={styles.userArea}>
                        <div className={styles.avatar} aria-hidden="true">{avatarText}</div>
                        <div className={styles.userInfo}>
                            <strong>{displayName}</strong>
                            <span>{user.email}</span>
                        </div>
                    </div>
                </header>

                <main className={styles.content}>
                    {logoutError && <div className={styles.errorMessage}>{logoutError}</div>}

                    <section className={styles.welcomeSection}>
                        <div>
                            <p className={styles.welcomeTag}>Chào mừng trở lại</p>
                            <h2>Xin chào, {displayName}!</h2>
                            <p>Hôm nay bạn có thể chia sẻ, kết nối hoặc tìm kiếm sự hỗ trợ tại đây.</p>
                        </div>
                        <div className={styles.shieldDecoration}>🛡️</div>
                    </section>

                    <section aria-labelledby="quick-actions-title">
                        <div className={styles.sectionHeading}>
                            <div>
                                <h2 id="quick-actions-title">Hành động nhanh</h2>
                                <p>Truy cập nhanh các chức năng quan trọng.</p>
                            </div>
                        </div>

                        <div className={styles.actionGrid}>
                            {quickActions.map((action) => (
                                <Link
                                    key={action.title}
                                    to={action.to}
                                    className={`${styles.actionCard} ${action.danger ? styles.sosCard : ''}`}
                                >
                                    <span className={styles.actionIcon}>{action.icon}</span>
                                    <div>
                                        <h3>{action.title}</h3>
                                        <p>{action.description}</p>
                                    </div>
                                    <span className={styles.actionArrow}>→</span>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section aria-labelledby="latest-posts-title">
                        <div className={styles.sectionHeading}>
                            <div>
                                <h2 id="latest-posts-title">Bài viết mới nhất</h2>
                                <p>Thông tin hữu ích từ cộng đồng SafeSchool.</p>
                            </div>
                            <Link to="/news" className={styles.viewAll}>Xem tất cả</Link>
                        </div>

                        <div className={styles.postList}>
                            {mockPosts.map((post) => (
                                <article key={post.id} className={styles.postCard}>
                                    <div className={styles.postHeader}>
                                        <div className={styles.postAvatar}>{post.avatar}</div>
                                        <div>
                                            <strong>{post.author}</strong>
                                            <span>{post.time}</span>
                                        </div>
                                        <span className={styles.category}>{post.category}</span>
                                    </div>
                                    <h3>{post.title}</h3>
                                    <p>{post.content}</p>
                                    <div className={styles.postFooter}>
                                        <button type="button">♡ Quan tâm</button>
                                        <button type="button">💬 Bình luận</button>
                                        <button type="button">↗ Chia sẻ</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Home;