import api from "./axios";

/* ===========================================================
USER MANAGEMENT
=========================================================== */

export const getUsers = async () => {
  return await api.get("/api/admin/users");
};

export const updateUser = async (uid, data) => {
  return await api.put(`/api/admin/users/${uid}`, data);
};

export const deleteUser = async (uid, reason = "") => {
  return await api.delete(`/api/admin/users/${uid}`, {
    params: { reason },
  });
};

/* ===========================================================
  POST MANAGEMENT
=========================================================== */

export const getPosts = async (status = "all") => {
  return await api.get("/api/admin/posts", {
    params: { status },
  });
};

export const approvePost = async (postId, data) => {
  return await api.put(`/api/admin/posts/${postId}`, data);
};

export const deletePost = async (postId) => {
  return await api.delete(`/api/admin/posts/${postId}`);
};

/* ===========================================================
REPORT MANAGEMENT
=========================================================== */

/**
 * Danh sách báo cáo
 */
export const getReports = async (
  status = "all",
  priority = "all"
) => {
  return await api.get("/api/admin/reports", {
    params: {
      status,
      priority,
    },
  });
};

/**
 * Dashboard cá nhân
 */
export const getMyReports = async () => {
  return await api.get("/api/admin/reports/my");
};

/**
 * Danh sách người xử lý
 */
export const getHandlers = async () => {
  return await api.get("/api/admin/handlers");
};

/**
 * Cập nhật báo cáo (API cũ - vẫn giữ)
 */
export const updateReport = async (reportId, data) => {
  return await api.put(`/api/admin/reports/${reportId}`, data);
};

/* ===========================================================
NEW REPORT APIs (V2)
=========================================================== */

/**
 * Phân công người xử lý
 */
export const assignReport = async (reportId, data) => {
  return await api.post(
    `/api/admin/reports/${reportId}/assign`,
    data
  );
};

/**
 * Cập nhật trạng thái
 */
export const updateReportStatus = async (
  reportId,
  data
) => {
  return await api.put(
    `/api/admin/reports/${reportId}/status`,
    data
  );
};

/**
 * Gợi ý người xử lý
 */
export const suggestAssignees = async (reportId) => {
  return await api.get(
    `/api/admin/reports/${reportId}/suggest-assignees`
  );
};

/**
 * Tìm kiếm nâng cao
 */
export const searchReports = async (filters = {}) => {
  return await api.get("/api/admin/reports/search", {
    params: filters,
  });
};

/**
 * Xóa mềm
 */
export const softDeleteReport = async (reportId) => {
  return await api.delete(
    `/api/admin/reports/${reportId}/soft-delete`
  );
};

/**
 * Khôi phục
 */
export const restoreReport = async (reportId) => {
  return await api.put(
    `/api/admin/reports/${reportId}/restore`
  );
};

/**
 * Danh sách thùng rác
 */
export const getDeletedReports = async () => {
  return await api.get("/api/admin/reports/trash");
};

/**
 * Xóa vĩnh viễn
 */
export const permanentlyDeleteReport = async (
  reportId
) => {
  return await api.delete(
    `/api/admin/reports/${reportId}/permanent`
  );
};

/**
 * Lịch sử xử lý
 */
export const getReportHistory = async (reportId) => {
  return await api.get(
    `/api/admin/reports/${reportId}/history`
  );
};

/* ===========================================================
   SLA
=========================================================== */

export const checkSla = async () => {
  return await api.post(
    "/api/admin/reports/check-sla"
  );
};

/* ===========================================================
   TRACKING
=========================================================== */

export const trackReport = async (
  trackingCode
) => {
  return await api.get(
    `/api/reports/track/${trackingCode}`
  );
};

/* ===========================================================
   DASHBOARD
=========================================================== */

export const getStatistics = async () => {
  return await api.get(
    "/api/admin/statistics"
  );
};