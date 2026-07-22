import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getArticlesService } from '../../services/articleService';
import NewsCard from './NewsCard';
import './NewsList.css';

const CATEGORIES = [
  'Tất cả',
  'Phòng chống bạo lực',
  'Sức khỏe tâm lý',
  'Kỹ năng sống',
  'An toàn mạng',
  'Khác'
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'views', label: 'Xem nhiều nhất' },
  { value: 'likes', label: 'Thích nhiều nhất' }
];

export default function NewsList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [displayCount, setDisplayCount] = useState(6);

  // Fetch articles from Firestore
  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, selectedSort]);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArticlesService({
        category: selectedCategory,
        sortBy: selectedSort,
        search: searchQuery
      });
      setArticles(data);
    } catch (err) {
      console.error('Lỗi lấy danh sách bài viết:', err);
      setError('Không thể tải danh sách bài viết từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArticles();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchArticles();
  };

  const visibleArticles = articles.slice(0, displayCount);

  return (
    <div className="news-list-container">
      {/* Header Bar */}
      <div className="news-header-bar">
        <div>
          <h1 className="page-title">Bài Viết & Tin Tức Học Đường</h1>
          <p className="page-subtitle">
            Cập nhật những thông tin, kiến thức và kỹ năng sống bổ ích dành cho học sinh, phụ huynh và nhà trường.
          </p>
        </div>

        <button
          className="btn btn-primary btn-create-post"
          onClick={() => {
            if (user) {
              navigate('/articles/create');
            } else {
              alert('Vui lòng đăng nhập để tạo bài viết mới.');
              navigate('/login');
            }
          }}
        >
          ➕ Tạo bài viết mới
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="news-filter-toolbar">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm bài viết theo tiêu đề, nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={handleClearSearch}>
                ✖
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary search-btn">
            Tìm kiếm
          </button>
        </form>

        {/* Sort Dropdown */}
        <div className="sort-wrapper">
          <label className="sort-label">Sắp xếp:</label>
          <select
            className="sort-select"
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="category-pills">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid / Loading / Error / Empty States */}
      {loading ? (
        <div className="news-loading-state">
          <div className="spinner"></div>
          <p>Đang tải bài viết từ hệ thống...</p>
        </div>
      ) : error ? (
        <div className="news-error-state">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchArticles}>Thử lại</button>
        </div>
      ) : visibleArticles.length === 0 ? (
        <div className="news-empty-state">
          <span className="empty-icon">📂</span>
          <h3>Chưa có bài viết nào</h3>
          <p>Không tìm thấy bài viết nào phù hợp với bộ lọc hoặc tìm kiếm hiện tại.</p>
          {user && (
            <button className="btn btn-primary" onClick={() => navigate('/articles/create')}>
              Hãy là người đầu tiên viết bài
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="articles-grid">
            {visibleArticles.map(article => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {/* Load More Button */}
          {displayCount < articles.length && (
            <div className="load-more-container">
              <button
                className="btn btn-secondary load-more-btn"
                onClick={() => setDisplayCount(prev => prev + 6)}
              >
                Xem thêm bài viết ({articles.length - displayCount})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
