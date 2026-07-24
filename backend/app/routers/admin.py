import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from app.dependencies.auth import get_admin_user
from app.models.schemas import (
    UserUpdate, UserResponse,
    PostApprove, PostResponse,
    ReportUpdate, ReportResponse,
    StatisticsResponse, ApiResponse
)
from app.services.firestore import FirestoreService

logger = logging.getLogger("safeschool.router.admin")

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Management"],
    dependencies=[Depends(get_admin_user)]  # Bảo vệ tất cả endpoint bằng Dependency admin
)

# ==================== 1. QUẢN LÝ USER ====================

@router.get("/users", response_model=ApiResponse, summary="Lấy danh sách người dùng (Ẩn mật khẩu)")
async def admin_get_users(admin_uid: str = Depends(get_admin_user)):
    """
    **Antigravity User Management**: Trả về danh sách tất cả người dùng trong hệ thống.
    - Mật khẩu và thông tin nhạy cảm đã bị ẩn tự động.
    - Yêu cầu token quyền Admin.
    """
    users = await FirestoreService.get_all_users()
    return ApiResponse(
        success=True,
        message=f"Lấy thành công {len(users)} người dùng",
        data=users
    )


@router.put("/users/{uid}", response_model=ApiResponse, summary="Khóa/Mở khóa hoặc đổi quyền người dùng")
async def admin_update_user(
    uid: str,
    update_data: UserUpdate,
    admin_uid: str = Depends(get_admin_user)
):
    """
    **Antigravity Security**: Cho phép Admin cập nhật trạng thái `is_active`, `role` hoặc `is_anonymous` của tài khoản.
    - Tự động ghi log thao tác Admin vào collection `admin_logs`.
    """
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="Không có thông tin nào được cập nhật")

    result = await FirestoreService.update_user(uid=uid, update_dict=update_dict, admin_uid=admin_uid)
    return ApiResponse(
        success=True,
        message="Cập nhật thông tin người dùng thành công",
        data=result
    )


@router.delete("/users/{uid}", response_model=ApiResponse, summary="Xóa vĩnh viễn tài khoản người dùng")
async def admin_delete_user(
    uid: str,
    admin_uid: str = Depends(get_admin_user)
):
    """
    **Antigravity User Management**: Cho phép Admin xóa vĩnh viễn tài khoản người dùng.
    - Xóa khỏi Firestore và Firebase Auth.
    - Tự động ghi log thao tác Admin vào collection `admin_logs`.
    """
    result = await FirestoreService.delete_user(uid=uid, admin_uid=admin_uid)
    return ApiResponse(
        success=True,
        message="Xóa tài khoản người dùng thành công",
        data=result
    )



# ==================== 2. QUẢN LÝ BÀI VIẾT ====================

@router.get("/posts", response_model=ApiResponse, summary="Lấy danh sách bài viết (Có lọc theo status)")
async def admin_get_posts(
    status_filter: str = Query("all", alias="status", description="Lọc trạng thái: pending, approved, rejected, hoặc all"),
    admin_uid: str = Depends(get_admin_user)
):
    """
    Lấy danh sách các bài viết trong hệ thống, sắp xếp theo thời gian mới nhất.
    - Hỗ trợ lọc theo `pending`, `approved`, `rejected`.
    """
    posts = await FirestoreService.get_all_posts(status_filter=status_filter)
    return ApiResponse(
        success=True,
        message=f"Lấy thành công {len(posts)} bài viết",
        data=posts
    )


@router.put("/posts/{post_id}", response_model=ApiResponse, summary="Duyệt hoặc từ chối bài viết")
async def admin_approve_post(
    post_id: str,
    approve_data: PostApprove,
    admin_uid: str = Depends(get_admin_user)
):
    """
    **Antigravity Auto Moderation & Notification**:
    - Duyệt bài viết (`approved`) hoặc từ chối bài viết (`rejected`).
    - Yêu cầu nhập lý do nếu từ chối (`reason`).
    - Tự động gửi thông báo đến tác giả bài viết (collection `notifications`).
    """
    if approve_data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ! Chỉ chấp nhận 'approved' hoặc 'rejected'")

    if approve_data.status == "rejected" and not approve_data.reason:
        raise HTTPException(status_code=400, detail="Bắt buộc phải nhập lý do khi từ chối bài viết")

    result = await FirestoreService.approve_or_reject_post(
        post_id=post_id,
        status_val=approve_data.status,
        reason=approve_data.reason,
        admin_uid=admin_uid
    )
    return ApiResponse(
        success=True,
        message=f"Bài viết đã được chuyển sang trạng thái: {approve_data.status}",
        data=result
    )

@router.delete("/posts/{post_id}", response_model=ApiResponse, summary="Xóa vĩnh viễn bài viết")
async def admin_delete_post(post_id: str, admin_uid: str = Depends(get_admin_user)):
    result = await FirestoreService.delete_post(
        post_id=post_id,
        admin_uid=admin_uid
    )
    return ApiResponse(
        success=True,
        message="Xóa bài viết thành công",
        data=result
    )

# ==================== 3. QUẢN LÝ BÁO CÁO ====================

@router.get("/reports", response_model=ApiResponse, summary="Lấy danh sách báo cáo (Ưu tiên báo cáo SOS)")
async def admin_get_reports(
    status_filter: str = Query("all", alias="status", description="Lọc trạng thái: pending, processing, resolved, hoặc all"),
    admin_uid: str = Depends(get_admin_user)
):
    """
    **Antigravity Priority Queue**:
    - Danh sách báo cáo vi phạm bạo lực học đường.
    - Tự động ưu tiên báo cáo **SOS** đẩy lên đầu danh sách để xử lý khẩn cấp.
    """
    reports = await FirestoreService.get_all_reports(status_filter=status_filter)
    return ApiResponse(
        success=True,
        message=f"Lấy thành công {len(reports)} báo cáo",
        data=reports
    )


@router.put("/reports/{report_id}", response_model=ApiResponse, summary="Cập nhật trạng thái báo cáo")
async def admin_update_report(
    report_id: str,
    report_data: ReportUpdate,
    admin_uid: str = Depends(get_admin_user)
):
    """
    Cập nhật luồng xử lý báo cáo: `pending` → `processing` → `resolved` (hoặc `rejected`).
    - Ghi nhận thông tin người cập nhật và ghi log hệ thống.
    """
    if report_data.status not in ["pending", "processing", "resolved", "rejected"]:
        raise HTTPException(status_code=400, detail="Trạng thái báo cáo không hợp lệ")

    result = await FirestoreService.update_report_status(
        report_id=report_id,
        status_val=report_data.status,
        resolution=report_data.resolution,
        admin_uid=admin_uid
    )
    return ApiResponse(
        success=True,
        message="Cập nhật trạng thái báo cáo thành công",
        data=result
    )


# ==================== 4. THỐNG KÊ DASHBOARD ====================

@router.get("/statistics", response_model=ApiResponse, summary="Thống kê dữ liệu Dashboard Admin Real-time")
async def admin_get_statistics(admin_uid: str = Depends(get_admin_user)):
    """
    **Antigravity Real-Time Dashboard**:
    - Tổng số user, tổng bài viết, tổng báo cáo, báo cáo chờ xử lý và báo cáo khẩn cấp SOS.
    - Sử dụng listener/caching để phản hồi tức thì.
    """
    stats = await FirestoreService.get_dashboard_statistics()
    return ApiResponse(
        success=True,
        message="Lấy dữ liệu thống kê dashboard thành công",
        data=stats
    )
