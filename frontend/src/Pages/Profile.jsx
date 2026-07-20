import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();

  // Mock user data initial state
  const [userData, setUserData] = useState({
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    fullName: 'Nguyễn Văn A',
    username: 'nguyenvana_student',
    email: 'vana.nguyen@safeschool.edu.vn',
    phone: '0987654321',
    dob: '2010-05-15',
    gender: 'Nam',
    address: '123 Đường Láng, Đống Đa, Hà Nội',
    role: 'Học sinh',
    createdAt: '15/09/2025'
  });

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...userData });
  const [errors, setErrors] = useState({});

  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  // Input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear validation error on change
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value
    });
    if (passwordErrors[name]) {
      setPasswordErrors({
        ...passwordErrors,
        [name]: ''
      });
    }
  };

  // Validation
  const validateForm = () => {
    const tempErrors = {};
    if (!formData.fullName.trim()) {
      tempErrors.fullName = 'Họ và tên không được để trống.';
    }
    
    // Email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      tempErrors.email = 'Email không được để trống.';
    } else if (!emailRegex.test(formData.email)) {
      tempErrors.email = 'Email không hợp lệ (Ví dụ: abc@safeschool.edu.vn).';
    }

    // Phone regex (e.g. 10 digits starting with 0)
    const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
    if (!formData.phone.trim()) {
      tempErrors.phone = 'Số điện thoại không được để trống.';
    } else if (!phoneRegex.test(formData.phone)) {
      tempErrors.phone = 'Số điện thoại phải gồm 10 chữ số (Ví dụ: 0987654321).';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const validatePassword = () => {
    const tempErrors = {};
    if (!passwordForm.currentPassword) {
      tempErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    }
    if (!passwordForm.newPassword) {
      tempErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (passwordForm.newPassword.length < 6) {
      tempErrors.newPassword = 'Mật khẩu mới phải dài ít nhất 6 ký tự.';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      tempErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
    }

    setPasswordErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Save changes
  const handleSave = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setUserData({ ...formData });
      setIsEditing(false);
      alert('Cập nhật thông tin tài khoản thành công!');
    }
  };

  // Cancel edit
  const handleCancel = () => {
    setFormData({ ...userData });
    setErrors({});
    setIsEditing(false);
  };

  // Save password
  const handleSavePassword = (e) => {
    e.preventDefault();
    if (validatePassword()) {
      alert('Đổi mật khẩu thành công! (Mock action - logic tích hợp sau)');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    }
  };

  const handleLogout = () => {
    // In a real application, integration with Firebase Auth/AuthContext would go here:
    // e.g., const { logout } = useAuth(); await logout();
    console.log("Integrate Auth: Logging out user...");
    alert("Đăng xuất thành công! (Mock action - logic tích hợp sau)");
    navigate('/');
  };

  // Simulating picture change
  const handleAvatarChange = () => {
    if (!isEditing) return;
    const newUrl = prompt('Nhập URL ảnh mới (hoặc bấm Hủy để bỏ qua):', formData.avatar);
    if (newUrl) {
      setFormData({
        ...formData,
        avatar: newUrl
      });
    }
  };

  return (
    <div className="profile-page fade-in">
      <div className="container profile-container">
        
        {/* Profile Card Header */}
        <div className="profile-header-card">
          <div className="profile-header-visual">
            <div className={`profile-avatar-wrapper ${isEditing ? 'editable' : ''}`} onClick={handleAvatarChange}>
              <img src={isEditing ? formData.avatar : userData.avatar} alt="User Avatar" className="profile-avatar-img" />
              {isEditing && (
                <div className="avatar-edit-overlay">
                  <span>Thay đổi ảnh</span>
                </div>
              )}
            </div>
            <div className="profile-header-info">
              <h2 className="profile-name">{userData.fullName}</h2>
              <span className="profile-role-badge">🏷️ {userData.role}</span>
              <p className="profile-meta-text">Tài khoản được tạo ngày: {userData.createdAt}</p>
            </div>
          </div>
          <div className="profile-header-actions">
            {!isEditing ? (
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                ✍️ Chỉnh sửa thông tin
              </button>
            ) : (
              <div className="edit-actions-group">
                <button className="btn btn-success" onClick={handleSave}>
                  💾 Lưu thay đổi
                </button>
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Main Content Grid */}
        <div className="profile-grid">
          {/* Details Section */}
          <div className="profile-details-card">
            <h3 className="card-title">Thông Tin Cá Nhân</h3>
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-grid">
                
                {/* Fullname */}
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">Họ và tên</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    className={`form-input ${errors.fullName ? 'input-error' : ''}`}
                    value={isEditing ? formData.fullName : userData.fullName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                {/* Username (Read Only) */}
                <div className="form-group">
                  <label className="form-label" htmlFor="username">Tên đăng nhập</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="form-input disabled"
                    value={userData.username}
                    disabled
                  />
                  <span className="input-hint">Tên đăng nhập được khởi tạo mặc định và không thể thay đổi</span>
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email liên hệ</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                    value={isEditing ? formData.email : userData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Số điện thoại</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    className={`form-input ${errors.phone ? 'input-error' : ''}`}
                    value={isEditing ? formData.phone : userData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label className="form-label" htmlFor="dob">Ngày sinh</label>
                  <input
                    type="date"
                    id="dob"
                    name="dob"
                    className="form-input"
                    value={isEditing ? formData.dob : userData.dob}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                {/* Gender */}
                <div className="form-group">
                  <label className="form-label" htmlFor="gender">Giới tính</label>
                  <select
                    id="gender"
                    name="gender"
                    className="form-input select-input"
                    value={isEditing ? formData.gender : userData.gender}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Address */}
                <div className="form-group span-full">
                  <label className="form-label" htmlFor="address">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    className="form-input"
                    value={isEditing ? formData.address : userData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                {/* Role (Read Only) */}
                <div className="form-group">
                  <label className="form-label" htmlFor="role">Vai trò</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    className="form-input disabled"
                    value={userData.role}
                    disabled
                  />
                </div>

                {/* Account Created Date (Read Only) */}
                <div className="form-group">
                  <label className="form-label" htmlFor="createdAt">Ngày tham gia</label>
                  <input
                    type="text"
                    id="createdAt"
                    name="createdAt"
                    className="form-input disabled"
                    value={userData.createdAt}
                    disabled
                  />
                </div>

              </div>
            </form>
          </div>

          {/* Account Settings / Actions Section */}
          <div className="profile-settings-card">
            <h3 className="card-title">Cài Đặt Tài Khoản</h3>
            <div className="settings-buttons">
              
              {/* Toggle Change Password Section */}
              <button 
                className={`settings-btn ${showPasswordSection ? 'active' : ''}`}
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                <span className="btn-label">🔒 Đổi mật khẩu đăng nhập</span>
                <svg className={`chevron-icon ${showPasswordSection ? 'rotate' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Password Section */}
              {showPasswordSection && (
                <form onSubmit={handleSavePassword} className="password-form fade-in">
                  <div className="form-group">
                    <label className="form-label" htmlFor="currentPassword">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      className={`form-input ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                    />
                    {passwordErrors.currentPassword && <span className="error-message">{passwordErrors.currentPassword}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="newPassword">Mật khẩu mới</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      className={`form-input ${passwordErrors.newPassword ? 'input-error' : ''}`}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                    />
                    {passwordErrors.newPassword && <span className="error-message">{passwordErrors.newPassword}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      className={`form-input ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                    {passwordErrors.confirmPassword && <span className="error-message">{passwordErrors.confirmPassword}</span>}
                  </div>
                  <div className="password-actions">
                    <button type="submit" className="btn btn-primary btn-sm">
                      Lưu mật khẩu mới
                    </button>
                  </div>
                </form>
              )}

              <hr className="settings-divider" />

              {/* Log out option */}
              <button className="settings-btn logout-btn" onClick={handleLogout}>
                <span className="btn-label text-danger-heavy">
                  <svg className="btn-icon-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Đăng xuất tài khoản
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
