from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict, Literal
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
    reason: Optional[str] = Field(None, description="Lý do gửi kèm khi khóa hoặc xóa tài khoản")

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

class SLASchema(BaseModel):
    """Schema cho thông tin cam kết thời hạn dịch vụ SLA & Escalation"""
    responseDeadline: Optional[str] = Field(None, description="Hạn chót tiếp nhận xử lý (2h cho SOS/High)")
    resolutionDeadline: Optional[str] = Field(None, description="Hạn chót hoàn tất giải quyết (12-24h)")
    isResponseOverdue: bool = False
    isResolutionOverdue: bool = False
    isEscalated: bool = False
    escalatedAt: Optional[str] = None
    escalatedTo: List[str] = []

class ReportUpdate(BaseModel):
    """Schema cập nhật trạng thái & phân công xử lý báo cáo"""
    status: str = Field(..., description="Trạng thái báo cáo: 'processing', 'resolved', 'rejected'")
    resolution: Optional[str] = Field("", description="Ghi chú kết quả xử lý báo cáo")
    assignedTo: Optional[str] = Field(None, description="UID người xử lý được phân công (Admin hoặc Tham vấn viên)")
    assignedToName: Optional[str] = Field(None, description="Tên người xử lý được phân công")
    assignedToRole: Optional[str] = Field(None, description="Vai trò người xử lý: admin, counselor, teacher")
    progressNote: Optional[str] = Field(None, description="Ghi chú cập nhật tiến độ xử lý hiện tại")

class ReportCreate(BaseModel):
    """Schema gửi báo cáo mới từ người dùng"""
    title: str = Field(..., description="Tiêu đề báo cáo")
    description: Optional[str] = Field(None, description="Mô tả chi tiết báo cáo")
    priority: Optional[str] = Field("normal", description="Mức ưu tiên: sos, high, normal, low")
    location: Optional[str] = Field(None, description="Địa điểm xảy ra sự việc")
    type: Optional[str] = Field("report", description="Loại báo cáo: report hoặc sos_emergency")
    targetId: Optional[str] = Field(None, description="Đối tượng liên quan nếu có")

class ReportAssignRequest(BaseModel):
    """Schema yêu cầu phân công báo cáo cho cán bộ xử lý."""
    assigneeId: str = Field(..., min_length=1, description="UID người xử lý")
    note: Optional[str] = Field("", max_length=1000, description="Ghi chú phân công")

class AssignmentRuleCreate(BaseModel):
    name: str
    reportType: Optional[str] = None
    keywords: List[str] = []
    assigneeId: str
    priority: int = 100
    isActive: bool = True

class ReportStatusUpdateRequest(BaseModel):
    """Schema cập nhật trạng thái báo cáo"""
    status: Literal["pending", "processing", "resolved", "rejected"]
    resolution: Optional[str] = Field("", description="Kết quả giải quyết")
    note: Optional[str] = Field("", description="Ghi chú tiến độ")

class AssigneeSuggestion(BaseModel):
    """Schema gợi ý người xử lý thông minh dựa trên Workload và Chuyên môn"""
    uid: str
    displayName: str
    email: Optional[str] = None
    role: str  # admin, psychologist, counselor, teacher
    workload: int = 0
    matchScore: int = 0  # Điểm tương thích 0-100
    matchReason: str = ""

class ReportResponse(BaseModel):
    """Schema phản hồi thông tin báo cáo Antigravity đầy đủ"""
    id: str
    trackingCode: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    reporterId: Optional[str] = None
    reporterName: Optional[str] = None
    targetId: Optional[str] = None
    priority: str = "normal"  # SOS, high, normal, low
    status: str = "pending"   # pending, processing, resolved, rejected
    resolution: Optional[str] = None
    assignedTo: Optional[str] = None
    assignedToName: Optional[str] = None
    assignedToRole: Optional[str] = None
    assignedAt: Optional[str] = None
    assignedBy: Optional[str] = None
    history: List[Dict[str, Any]] = []
    progressNotes: List[Dict[str, Any]] = []
    autoTags: List[str] = []
    trustScore: Optional[int] = 80
    sla: Optional[SLASchema] = None
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class HandlerUserResponse(BaseModel):
    """Schema thông tin người xử lý (Admin / Tham vấn viên / Chuyên gia)"""
    uid: str
    displayName: Optional[str] = None
    email: Optional[str] = None
    role: str
    workload: int = 0

class ReportTrackResponse(BaseModel):
    """Schema công khai cho người dùng tra cứu tiến độ báo cáo qua trackingCode"""
    trackingCode: str
    title: str
    status: str
    priority: str
    resolution: Optional[str] = None
    createdAt: str
    updatedAt: str
    slaStatus: str = "In SLA"


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