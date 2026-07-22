import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getArticleByIdService,
  toggleLikeService,
  toggleFavoriteService,
  checkIsFavoriteService,
  getCommentsService,
  addCommentService,
  updateCommentService,
  deleteCommentService,
  softDeleteArticleService
} from '../../services/articleService';
import './ArticleDetail.css';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Like & Favorite States
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Comments State
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchArticleAndData();
    }
  }, [id, user]);

  const fetchArticleAndData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArticleByIdService(id, true);
      if (!data) {
        setError('Bài viết không tồn tại hoặc đã bị xóa.');
        setLoading(false);
        return;
      }

      setArticle(data);
      setLikesCount(data.likes || 0);
      setFavoritesCount(data.favoritesCount || 0);

      // Check if current user liked
      if (user && data.likedBy && Array.isArray(data.likedBy)) {
        setIsLiked(data.likedBy.includes(user.uid));
      } else {
        setIsLiked(false);
      }

      // Check if favorite in 'fav' collection
      if (user) {
        const favStatus = await checkIsFavoriteService(id, user.uid);
        setIsFavorite(favStatus);
      } else {
        setIsFavorite(false);
      }

      // Fetch comments
      const commentsData = await getCommentsService(id);
      setComments(commentsData);

    } catch (err) {
      console.error('Error fetching article detail:', err);
      setError('Đã xảy ra lỗi khi tải bài viết.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Like
  const handleLike = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để thích bài viết.');
      navigate('/login');
      return;
    }

    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      await toggleLikeService(id, user.uid, prevLiked);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert on error
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  // Toggle Favorite
  const handleFavorite = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để lưu bài viết vào danh sách yêu thích.');
      navigate('/login');
      return;
    }

    const prevFav = isFavorite;
    const prevCount = favoritesCount;

    setIsFavorite(!prevFav);
    setFavoritesCount(prevFav ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      await toggleFavoriteService(id, user.uid, prevFav);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setIsFavorite(prevFav);
      setFavoritesCount(prevCount);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Vui lòng đăng nhập để bình luận.');
      navigate('/login');
      return;
    }

    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const addedComment = await addCommentService(id, user, newCommentText);
      setComments(prev => [...prev, addedComment]);
      setNewCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Save edited comment
  const handleSaveEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateCommentService(commentId, editingCommentText);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editingCommentText } : c));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('Không thể cập nhật bình luận.');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      await deleteCommentService(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Không thể xóa bình luận.');
    }
  };

  // Share Article
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } else {
      alert(`Đã sao chép liên kết bài viết: ${url}`);
    }
  };

  // Soft Delete Article
  const handleSoftDelete = async () => {
    try {
      await softDeleteArticleService(id);
      alert('Bài viết đã được xóa thành công.');
      navigate('/articles');
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Không thể xóa bài viết. Vui lòng thử lại.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
  const defaultImage = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80';

  const isAuthor = user && article && (user.uid === article.authorId || user.role === 'admin');

  if (loading) {
    return (
      <div className="article-detail-container">
        <div className="detail-loading-state">
          <div className="spinner"></div>
          <p>Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article-detail-container">
        <div className="detail-error-state">
          <h2>⚠️ Lỗi</h2>
          <p>{error || 'Bài viết không tìm thấy.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/articles')}>
            Quay lại danh sách bài viết
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="article-detail-container fade-in">
      {/* Navigation Breadcrumb */}
      <div className="detail-breadcrumb">
        <button className="back-link-btn" onClick={() => navigate('/articles')}>
          ← Quay lại danh sách bài viết
        </button>
      </div>

      {/* Main Reader Box */}
      <div className="article-reader-card">
        {/* Cover Image */}
        <div className="detail-cover-wrapper">
          <img
            src={article.coverImage || defaultImage}
            alt={article.title}
            className="detail-cover-img"
            onError={(e) => { e.target.src = defaultImage; }}
          />
          <span className="detail-category-badge">{article.category || 'Bài viết'}</span>
        </div>

        {/* Header Content */}
        <div className="detail-header">
          <h1 className="detail-title">{article.title}</h1>

          <div className="detail-author-row">
            <div className="author-box">
              <img
                src={article.authorAvatar || defaultAvatar}
                alt={article.authorName}
                className="author-avatar-md"
                onError={(e) => { e.target.src = defaultAvatar; }}
              />
              <div>
                <p className="author-name-text">{article.authorName || 'Safe School Author'}</p>
                <p className="publish-time-text">Đăng ngày {formatDate(article.createdAt)}</p>
              </div>
            </div>

            {/* Author / Admin Action Buttons */}
            {isAuthor && (
              <div className="author-controls">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/articles/edit/${article.id}`)}
                >
                  ✏️ Chỉnh sửa
                </button>
                <button
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  🗑️ Xóa bài
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Short Summary Callout */}
        {article.summary && (
          <div className="detail-summary-box">
            <p>{article.summary}</p>
          </div>
        )}

        {/* Article Body Content */}
        <div className="detail-body-content">
          {article.content ? (
            article.content.split('\n').map((paragraph, index) => (
              paragraph.trim() !== '' ? <p key={index}>{paragraph}</p> : <br key={index} />
            ))
          ) : (
            <p>Không có nội dung bài viết.</p>
          )}
        </div>

        {/* Tags Section */}
        {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="detail-tags-section">
            <span className="tags-label">Thẻ chủ đề:</span>
            <div className="tags-list">
              {article.tags.map((tag, idx) => (
                <span key={idx} className="tag-pill">#{tag}</span>
              ))}
            </div>
          </div>
        )}

        <hr className="detail-divider" />

        {/* Bottom Interaction Bar */}
        <div className="detail-stats-action-bar">
          <div className="detail-stats">
            <span className="stat-badge" title="Lượt xem">
              👁️ <strong>{article.views || 0}</strong> lượt xem
            </span>
            <span className="stat-badge" title="Lượt thích">
              ❤️ <strong>{likesCount}</strong> lượt thích
            </span>
            <span className="stat-badge" title="Yêu thích">
              ⭐ <strong>{favoritesCount}</strong> đã lưu
            </span>
            <span className="stat-badge" title="Bình luận">
              💬 <strong>{comments.length}</strong> bình luận
            </span>
          </div>

          <div className="detail-action-buttons">
            <button
              className={`action-btn like-btn ${isLiked ? 'active' : ''}`}
              onClick={handleLike}
            >
              {isLiked ? '❤️ Đã thích' : '🤍 Thích'} ({likesCount})
            </button>

            <button
              className={`action-btn fav-btn ${isFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
            >
              {isFavorite ? '⭐ Đã lưu' : '☆ Yêu thích'}
            </button>

            <button
              className="action-btn share-btn"
              onClick={handleShare}
            >
              🔗 Chia sẻ
            </button>
          </div>
        </div>

        {shareSuccess && (
          <div className="share-toast">
            ✅ Đã sao chép liên kết bài viết vào bộ nhớ tạm!
          </div>
        )}
      </div>

      {/* Comments Section */}
      <section className="comments-section" id="comments-section">
        <h2 className="comments-title">Bình Luận ({comments.length})</h2>

        {/* Comment Form */}
        <form onSubmit={handleAddComment} className="comment-form">
          <div className="comment-input-row">
            <img
              src={user?.avatarUrl || defaultAvatar}
              alt="User Avatar"
              className="comment-user-avatar"
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
            <div className="comment-input-box">
              <textarea
                className="comment-textarea"
                rows="3"
                placeholder={user ? "Viết bình luận của bạn tại đây..." : "Đăng nhập để tham gia bình luận..."}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={!user}
              />
              <div className="comment-form-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!user || !newCommentText.trim() || submittingComment}
                >
                  {submittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="no-comments-box">
              <p>Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ ý kiến.</p>
            </div>
          ) : (
            comments.map((cmt) => (
              <div key={cmt.id} className="comment-item">
                <img
                  src={cmt.userAvatar || defaultAvatar}
                  alt={cmt.userName}
                  className="comment-avatar"
                  onError={(e) => { e.target.src = defaultAvatar; }}
                />

                <div className="comment-content-wrapper">
                  <div className="comment-header">
                    <span className="comment-user-name">{cmt.userName || 'Thành viên'}</span>
                    <span className="comment-time">{formatDate(cmt.createdAt)}</span>
                  </div>

                  {editingCommentId === cmt.id ? (
                    <div className="edit-comment-box">
                      <textarea
                        className="comment-textarea edit-mode"
                        rows="2"
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                      />
                      <div className="edit-comment-actions">
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => handleSaveEditComment(cmt.id)}
                        >
                          Lưu
                        </button>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-text">{cmt.content}</p>
                  )}

                  {/* Comment Owner Actions */}
                  {user && user.uid === cmt.userId && editingCommentId !== cmt.id && (
                    <div className="comment-actions">
                      <button
                        className="comment-action-link"
                        onClick={() => { setEditingCommentId(cmt.id); setEditingCommentText(cmt.content); }}
                      >
                        Sửa
                      </button>
                      <span className="dot-divider">•</span>
                      <button
                        className="comment-action-link text-danger"
                        onClick={() => handleDeleteComment(cmt.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Xác Nhận Xóa Bài Viết</h3>
            <p>Bạn có chắc chắn muốn xóa bài viết <strong>"{article.title}"</strong> không? Hành động này sẽ chuyển trạng thái bài viết thành đã xóa (xóa mềm).</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Hủy bỏ
              </button>
              <button className="btn btn-danger" onClick={handleSoftDelete}>
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
