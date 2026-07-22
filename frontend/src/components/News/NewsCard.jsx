import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NewsCard.css';

export default function NewsCard({ article, commentsCount = 0 }) {
  const navigate = useNavigate();

  if (!article) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
  const defaultImage = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80';

  return (
    <article className="news-card">
      {/* Cover Image Container */}
      <div className="card-image-container" onClick={() => navigate(`/articles/${article.id}`)}>
        <img 
          src={article.coverImage || defaultImage} 
          alt={article.title} 
          className="card-cover-image"
          onError={(e) => { e.target.src = defaultImage; }}
        />
        <span className="card-category-tag">
          {article.category || 'Kiến thức'}
        </span>
      </div>

      {/* Card Content Body */}
      <div className="card-body">
        {/* Author & Meta */}
        <div className="card-author-meta">
          <div className="author-info">
            <img 
              src={article.authorAvatar || defaultAvatar} 
              alt={article.authorName || 'Tác giả'} 
              className="author-avatar-sm"
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
            <span className="author-name">{article.authorName || 'Safe School'}</span>
          </div>
          <span className="publish-date">{formatDate(article.createdAt)}</span>
        </div>

        {/* Title */}
        <h3 
          className="card-title" 
          onClick={() => navigate(`/articles/${article.id}`)}
          title={article.title}
        >
          {article.title}
        </h3>

        {/* Short Summary */}
        <p className="card-summary">
          {article.summary || article.content?.substring(0, 120) + '...'}
        </p>

        {/* Card Footer Metrics & Action */}
        <div className="card-footer">
          <div className="card-metrics">
            <span className="metric-item" title="Lượt xem">
              👁️ {article.views || 0}
            </span>
            <span className="metric-item" title="Lượt thích">
              ❤️ {article.likes || 0}
            </span>
            <span className="metric-item" title="Bình luận">
              💬 {commentsCount || 0}
            </span>
          </div>

          <button 
            className="btn-read-more" 
            onClick={() => navigate(`/articles/${article.id}`)}
          >
            Đọc tiếp
            <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
