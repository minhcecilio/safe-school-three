import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createArticleService,
  getArticleByIdService,
  updateArticleService
} from '../../services/articleService';
import './CreatePost.css';

const CATEGORIES = [
  'Phòng chống bạo lực',
  'Sức khỏe tâm lý',
  'Kỹ năng sống',
  'An toàn mạng',
  'Khác'
];

export default function CreatePost() {
  const { id } = useParams(); // If present, edit mode
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Phòng chống bạo lực',
    summary: '',
    content: '',
    coverImage: '',
    tagsInput: '',
    visibility: 'public',
    status: 'published'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingArticle, setFetchingArticle] = useState(false);

  // If edit mode, load article details
  useEffect(() => {
    if (isEditMode && id) {
      fetchExistingArticle();
    }
  }, [id]);

  const fetchExistingArticle = async () => {
    setFetchingArticle(true);
    try {
      const article = await getArticleByIdService(id, false);
      if (!article) {
        alert('Không tìm thấy bài viết hoặc bài viết đã bị xóa.');
        navigate('/articles');
        return;
      }

      // Check permissions
      if (user && user.uid !== article.authorId && user.role !== 'admin') {
        alert('Bạn không có quyền chỉnh sửa bài viết này.');
        navigate(`/articles/${id}`);
        return;
      }

      setFormData({
        title: article.title || '',
        category: article.category || 'Phòng chống bạo lực',
        summary: article.summary || '',
        content: article.content || '',
        coverImage: article.coverImage || '',
        tagsInput: article.tags ? article.tags.join(', ') : '',
        visibility: article.visibility || 'public',
        status: article.status || 'published'
      });
    } catch (err) {
      console.error('Error fetching existing article:', err);
      alert('Đã xảy ra lỗi khi tải thông tin bài viết.');
    } finally {
      setFetchingArticle(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Vui lòng nhập tiêu đề bài viết.';
    }
    if (!formData.summary.trim()) {
      errs.summary = 'Vui lòng nhập mô tả ngắn.';
    }
    if (!formData.content.trim()) {
      errs.content = 'Vui lòng nhập nội dung chi tiết bài viết.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Vui lòng đăng nhập để thực hiện.');
      navigate('/login');
      return;
    }

    if (!validate()) return;

    setLoading(true);

    const tagsArray = formData.tagsInput
      ? formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      summary: formData.summary.trim(),
      content: formData.content.trim(),
      coverImage: formData.coverImage.trim() || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80',
      tags: tagsArray,
      visibility: formData.visibility,
      status: formData.status
    };

    try {
      if (isEditMode) {
        await updateArticleService(id, payload);
        alert('Cập nhật bài viết thành công!');
        navigate(`/articles/${id}`);
      } else {
        const newId = await createArticleService(payload, user);
        alert('Đăng bài viết mới thành công!');
        navigate(`/articles/${newId}`);
      }
    } catch (err) {
      console.error('Error saving article:', err);
      alert('Đã xảy ra lỗi khi lưu bài viết. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingArticle) {
    return (
      <div className="create-post-container">
        <div className="create-post-loading">
          <div className="spinner"></div>
          <p>Đang nạp thông tin bài viết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-post-container fade-in">
      <div className="create-post-header">
        <button className="back-link-btn" onClick={() => navigate('/articles')}>
          ← Quay lại danh sách
        </button>
        <h1 className="form-page-title">
          {isEditMode ? 'Chỉnh Sửa Bài Viết' : 'Tạo Bài Viết Mới'}
        </h1>
        <p className="form-page-subtitle">
          {isEditMode
            ? 'Cập nhật lại nội dung, ảnh bìa và các thông tin cần thiết cho bài viết của bạn.'
            : 'Chia sẻ kiến thức, giải pháp và kinh nghiệm bảo vệ an toàn học đường cùng cộng đồng.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="post-form-card">
        {/* Title */}
        <div className="form-group">
          <label className="form-label" htmlFor="title">
            Tiêu đề bài viết <span className="text-required">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className={`form-input ${errors.title ? 'input-error' : ''}`}
            placeholder="Ví dụ: Kỹ năng ứng phó khi bị bắt nạt học đường..."
            value={formData.title}
            onChange={handleChange}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        {/* Category & Visibility Row */}
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="category">
              Danh mục <span className="text-required">*</span>
            </label>
            <select
              id="category"
              name="category"
              className="form-input select-input"
              value={formData.category}
              onChange={handleChange}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="visibility">
              Mức độ hiển thị
            </label>
            <select
              id="visibility"
              name="visibility"
              className="form-input select-input"
              value={formData.visibility}
              onChange={handleChange}
            >
              <option value="public">Công khai (Public)</option>
              <option value="private">Riêng tư (Private)</option>
            </select>
          </div>
        </div>

        {/* Short Summary */}
        <div className="form-group">
          <label className="form-label" htmlFor="summary">
            Mô tả ngắn <span className="text-required">*</span>
          </label>
          <textarea
            id="summary"
            name="summary"
            rows="3"
            className={`form-input ${errors.summary ? 'input-error' : ''}`}
            placeholder="Tóm tắt ngắn gọn nội dung bài viết (hiển thị trên thẻ bài viết)..."
            value={formData.summary}
            onChange={handleChange}
          />
          {errors.summary && <span className="error-message">{errors.summary}</span>}
        </div>

        {/* Cover Image URL & Live Preview */}
        <div className="form-group">
          <label className="form-label" htmlFor="coverImage">
            URL Ảnh bìa
          </label>
          <input
            type="url"
            id="coverImage"
            name="coverImage"
            className="form-input"
            placeholder="https://example.com/image.jpg (Dán đường dẫn hình ảnh)"
            value={formData.coverImage}
            onChange={handleChange}
          />
          {formData.coverImage && (
            <div className="cover-image-preview">
              <span className="preview-label">Xem trước ảnh bìa:</span>
              <img
                src={formData.coverImage}
                alt="Preview"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Full Content */}
        <div className="form-group">
          <label className="form-label" htmlFor="content">
            Nội dung chi tiết <span className="text-required">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows="10"
            className={`form-input ${errors.content ? 'input-error' : ''}`}
            placeholder="Viết nội dung đầy đủ của bài viết tại đây. Mỗi dòng xuống hàng sẽ được tạo thành một đoạn văn mới..."
            value={formData.content}
            onChange={handleChange}
          />
          {errors.content && <span className="error-message">{errors.content}</span>}
        </div>

        {/* Tags & Status Row */}
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="tagsInput">
              Thẻ chủ đề (Tags)
            </label>
            <input
              type="text"
              id="tagsInput"
              name="tagsInput"
              className="form-input"
              placeholder="Nhập các thẻ phân cách bằng dấu phẩy (Ví dụ: bạclực, kĩnăng, an toàn)"
              value={formData.tagsInput}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">
              Trạng thái bài viết
            </label>
            <select
              id="status"
              name="status"
              className="form-input select-input"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="published">Xuất bản ngay (Published)</option>
              <option value="draft">Bản nháp (Draft)</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="form-card-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isEditMode ? `/articles/${id}` : '/articles')}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : isEditMode ? 'Lưu cập nhật' : 'Đăng bài viết'}
          </button>
        </div>
      </form>
    </div>
  );
}
