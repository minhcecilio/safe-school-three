import api from './axios';

/**
 * Lấy danh sách tất cả người dùng trong hệ thống (chỉ Admin)
 */
export const getUsers = async () => {
  return await api.get('/api/admin/users');
};

/**
 * Cập nhật thông tin người dùng (Khóa/Mở khóa, Đổi role)
 * @param {string} uid 
 * @param {Object} data { is_active: boolean, role: string, is_anonymous: boolean }
 */
export const updateUser = async (uid, data) => {
  return await api.put(`/api/admin/users/${uid}`, data);
};

/**
 * Lấy danh sách bài viết trong hệ thống
 * @param {string} status 'all' | 'pending' | 'approved' | 'rejected'
 */
export const getPosts = async (status = 'all') => {
  return await api.get('/api/admin/posts', {
    params: { status }
  });
};

/**
 * Duyệt hoặc từ chối bài viết
 * @param {string} postId 
 * @param {Object} data { status: 'approved' | 'rejected', reason: string }
 */
export const approvePost = async (postId, data) => {
  return await api.put(`/api/admin/posts/${postId}`, data);
};

/**
 * Lấy danh sách báo cáo vi phạm/khẩn cấp
 * @param {string} status 'all' | 'pending' | 'processing' | 'resolved'
 */
export const getReports = async (status = 'all') => {
  return await api.get('/api/admin/reports', {
    params: { status }
  });
};

/**
 * Cập nhật trạng thái báo cáo
 * @param {string} reportId 
 * @param {Object} data { status: 'processing' | 'resolved' | 'rejected', resolution: string }
 */
export const updateReport = async (reportId, data) => {
  return await api.put(`/api/admin/reports/${reportId}`, data);
};

/**
 * Lấy dữ liệu thống kê tổng quan cho Dashboard
 */
export const getStatistics = async () => {
  return await api.get('/api/admin/statistics');
};
