from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

# ==================== RESPONSE SCHEMAS CHUẨN ====================

class ApiResponse(BaseModel):
    """Schema cho kết quả trả về chung của API"""
    success: bool = True
    message: Optional[str] = "Thành công"
    data: Optional[Any] = None

# ==================== SCHEMAS MANAGEMENT USER ====================

class UserUpdate(BaseModel):
    """Schema cập nhật thông tin user (Khóa/Mở khóa, đổi role)"""
    is_active: Optional[bool] = Field(None, description="Trạng thái hoạt động của tài khoản")
    role: Optional[str] = Field(None, description="Vai trò: admin, teacher, student, counselor")
    is_anonymous: Optional[bool] = Field(None, description="Trạng thái ẩn danh")

class UserResponse(BaseModel):
    """Schema thông tin user trả về cho Admin (Đã loại bỏ mật khẩu)"""
    uid: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    role: Optional[str] = "student"
    is_active: Optional[bool] = True
    is_anonymous: Optional[bool] = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    model_config = ConfigDict(extra="allow")

# ==================== SCHEMAS QUẢN LÝ BÀI VIẾT ====================

class PostApprove(BaseModel):
    """Schema cho việc duyệt hoặc từ chối bài viết"""
    status: str = Field(..., description="Trạng thái bài viết: 'approved' hoặc 'rejected'")
    reason: Optional[str] = Field("", description="Lý do từ chối bài viết (bắt buộc nếu status='rejected')")

class PostResponse(BaseModel):
    """Schema phản hồi thông tin bài viết"""
    id: str
    title: Optional[str] = None
    content: Optional[str] = None
    authorId: Optional[str] = None
    authorName: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    reason: Optional[str] = None
    createdAt: Optional[str] = None
    moderatedAt: Optional[str] = None
    moderatedBy: Optional[str] = None

    model_config = ConfigDict(extra="allow")

# ==================== SCHEMAS QUẢN LÝ BÁO CÁO ====================

class ReportUpdate(BaseModel):
    """Schema cập nhật trạng thái báo cáo vi phạm/khẩn cấp"""
    status: str = Field(..., description="Trạng thái báo cáo: 'processing', 'resolved', 'rejected'")
    resolution: Optional[str] = Field("", description="Ghi chú kết quả xử lý báo cáo")

class ReportResponse(BaseModel):
    """Schema phản hồi thông tin báo cáo"""
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    reporterId: Optional[str] = None
    targetId: Optional[str] = None
    priority: str = "normal"  # SOS, high, normal, low
    status: str = "pending"   # pending, processing, resolved, rejected
    resolution: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None

    model_config = ConfigDict(extra="allow")

# ==================== SCHEMAS THỐNG KÊ DASHBOARD ====================

class StatisticsResponse(BaseModel):
    """Schema thống kê Dashboard Admin"""
    users: int = 0
    posts: int = 0
    reports: int = 0
    pendingReports: int = 0
    pendingPosts: int = 0
    sosReports: int = 0

# ==================== SCHEMAS NOTIFICATION & AUDIT LOGS ====================

class NotificationSchema(BaseModel):
    """Schema lưu thông báo gửi tới người dùng"""
    user_id: str
    title: str
    message: str
    type: str = "system"  # system, post_approval, report_update, sos_alert
    read: bool = False
    createdAt: Optional[str] = None

class AdminLogSchema(BaseModel):
    """Schema ghi nhật ký thao tác của Admin"""
    admin_uid: str
    action: str  # e.g., UPDATE_USER, APPROVE_POST, REJECT_POST, UPDATE_REPORT
    target_type: str  # user, post, report
    target_id: str
    details: Optional[Dict[str, Any]] = None
    timestamp: str
