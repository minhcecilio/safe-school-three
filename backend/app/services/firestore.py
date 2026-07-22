import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from google.cloud import firestore
from fastapi import HTTPException, status
from app.config.firebase import get_firestore_db
from app.services.notification import NotificationService

logger = logging.getLogger("safeschool.firestore")

# Dynamic cache cho statistics phục vụ dashboard real-time
_stats_cache: Dict[str, Any] = {
    "users": 0,
    "posts": 0,
    "reports": 0,
    "pendingReports": 0,
    "pendingPosts": 0,
    "sosReports": 0,
    "last_updated": None
}
_stats_listener_initialized = False


class FirestoreService:
    """Service thao tác với dữ liệu trên Firestore Database"""

    @staticmethod
    async def log_admin_action(admin_uid: str, action: str, target_type: str, target_id: str, details: Optional[Dict[str, Any]] = None) -> bool:
        """
        Antigravity Audit Logger: Tự động ghi nhật ký mọi hành động của Admin vào collection 'admin_logs'
        """
        try:
            db = get_firestore_db()
            if not db:
                return False

            log_entry = {
                "admin_uid": admin_uid,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "details": details or {},
                "timestamp": datetime.now().isoformat()
            }
            db.collection("admin_logs").add(log_entry)
            logger.info(f"📝 [ADMIN LOG] Admin {admin_uid} thực hiện {action} trên {target_type}:{target_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi ghi log Admin: {e}")
            return False

    # ==================== QUẢN LÝ USER ====================

    @staticmethod
    async def get_all_users() -> List[Dict[str, Any]]:
        """Lấy danh sách người dùng (Hạn chế lộ dữ liệu: Ẩn mật khẩu & các trường nhạy cảm)"""
        db = get_firestore_db()
        if not db:
            return []

        try:
            users_ref = db.collection("users")
            docs = users_ref.stream()
            users = []

            for doc in docs:
                data = doc.to_dict()
                data["uid"] = doc.id
                # Bảo mật: Ẩn mật khẩu và token nếu có trong Firestore
                data.pop("password", None)
                data.pop("hashed_password", None)
                data.pop("secretToken", None)
                users.append(data)

            return users
        except Exception as e:
            logger.error(f"Lỗi lấy danh sách user: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách user: {str(e)}")

    @staticmethod
    async def update_user(uid: str, update_dict: Dict[str, Any], admin_uid: str) -> Dict[str, Any]:
        """Cập nhật trạng thái/vai trò của người dùng và ghi nhận nhật ký"""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Không có kết nối tới cơ sở dữ liệu")

        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User không tồn tại")

        # Thêm thời gian cập nhật
        update_dict["updatedAt"] = datetime.now().isoformat()
        user_ref.update(update_dict)

        # Log hành động admin
        await FirestoreService.log_admin_action(
            admin_uid=admin_uid,
            action="UPDATE_USER",
            target_type="user",
            target_id=uid,
            details=update_dict
        )

        return {"uid": uid, "updated": update_dict}

    # ==================== QUẢN LÝ BÀI VIẾT ====================

    @staticmethod
    async def get_all_posts(status_filter: str = "all") -> List[Dict[str, Any]]:
        """Lấy danh sách bài viết theo trạng thái (pending, approved, rejected)"""
        db = get_firestore_db()
        if not db:
            return []

        try:
            posts_ref = db.collection("posts")
            if status_filter != "all":
                posts_ref = posts_ref.where("status", "==", status_filter)

            docs = posts_ref.stream()
            posts = []

            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                posts.append(data)

            # Sắp xếp theo ngày tạo mới nhất ở trên
            posts.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return posts
        except Exception as e:
            logger.error(f"Lỗi lấy danh sách bài viết: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy bài viết: {str(e)}")

    @staticmethod
    async def approve_or_reject_post(post_id: str, status_val: str, reason: Optional[str], admin_uid: str) -> Dict[str, Any]:
        """Duyệt hoặc từ chối bài viết và tự động gửi thông báo cho tác giả"""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Cơ sở dữ liệu chưa sẵn sàng")

        post_ref = db.collection("posts").document(post_id)
        post_doc = post_ref.get()

        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

        post_data = post_doc.to_dict()
        author_id = post_data.get("authorId") or post_data.get("userId")

        update_data = {
            "status": status_val,
            "moderatedAt": datetime.now().isoformat(),
            "moderatedBy": admin_uid,
            "reason": reason or ""
        }
        post_ref.update(update_data)

        # Gửi thông báo tự động cho tác giả bài viết
        if author_id:
            status_text = "đã được duyệt thành công 🎉" if status_val == "approved" else "đã bị từ chối ⚠️"
            msg = f"Bài viết '{post_data.get('title', 'Bài viết')}' của bạn {status_text}."
            if status_val == "rejected" and reason:
                msg += f" Lý do: {reason}"

            await NotificationService.create_notification(
                user_id=author_id,
                title="Cập nhật trạng thái bài viết",
                message=msg,
                notification_type="post_approval"
            )

        # Ghi log admin
        await FirestoreService.log_admin_action(
            admin_uid=admin_uid,
            action=f"{status_val.upper()}_POST",
            target_type="post",
            target_id=post_id,
            details={"status": status_val, "reason": reason}
        )

        return {"id": post_id, "status": status_val}

    # ==================== QUẢN LÝ BÁO CÁO & SOS KHẨN CẤP ====================

    @staticmethod
    async def get_all_reports(status_filter: str = "all") -> List[Dict[str, Any]]:
        """
        Lấy danh sách báo cáo vi phạm/bạo lực.
        Antigravity: Ưu tiên báo cáo SOS lên đầu danh sách (SOS > high > normal > low).
        """
        db = get_firestore_db()
        if not db:
            return []

        try:
            reports_ref = db.collection("reports")
            if status_filter != "all":
                reports_ref = reports_ref.where("status", "==", status_filter)

            docs = reports_ref.stream()
            reports = []

            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                reports.append(data)

            # Quy đổi mức độ ưu tiên để sắp xếp
            priority_weight = {
                "SOS": 100,
                "sos": 100,
                "high": 50,
                "normal": 10,
                "low": 1
            }

            # Sắp xếp ưu tiên: SOS lên đầu, sau đó sắp xếp theo thời gian mới nhất
            reports.sort(
                key=lambda x: (
                    priority_weight.get(str(x.get("priority", "normal")), 0),
                    x.get("createdAt", "")
                ),
                reverse=True
            )
            return reports
        except Exception as e:
            logger.error(f"Lỗi lấy danh sách báo cáo: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy báo cáo: {str(e)}")

    @staticmethod
    async def update_report_status(report_id: str, status_val: str, resolution: Optional[str], admin_uid: str) -> Dict[str, Any]:
        """Cập nhật trạng thái báo cáo (pending -> processing -> resolved)"""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Cơ sở dữ liệu chưa sẵn sàng")

        report_ref = db.collection("reports").document(report_id)
        report_doc = report_ref.get()

        if not report_doc.exists:
            raise HTTPException(status_code=404, detail="Báo cáo không tồn tại")

        update_data = {
            "status": status_val,
            "resolution": resolution or "",
            "updatedAt": datetime.now().isoformat(),
            "updatedBy": admin_uid
        }
        report_ref.update(update_data)

        # Log admin
        await FirestoreService.log_admin_action(
            admin_uid=admin_uid,
            action="UPDATE_REPORT_STATUS",
            target_type="report",
            target_id=report_id,
            details=update_data
        )

        return {"id": report_id, "status": status_val}

    # ==================== DASHBOARD & REAL-TIME STATS ====================

    @staticmethod
    async def get_dashboard_statistics() -> Dict[str, Any]:
        """
        Antigravity Real-time Statistics: Trả về số liệu thống kê Dashboard.
        Tận dụng caching/listeners để cập nhật siêu nhanh.
        """
        global _stats_cache
        db = get_firestore_db()
        if not db:
            return _stats_cache

        try:
            users_count = len(list(db.collection("users").stream()))
            posts_count = len(list(db.collection("posts").stream()))
            reports_count = len(list(db.collection("reports").stream()))
            pending_reports = len(list(db.collection("reports").where("status", "==", "pending").stream()))
            pending_posts = len(list(db.collection("posts").where("status", "==", "pending").stream()))
            sos_reports = len(list(db.collection("reports").where("priority", "in", ["SOS", "sos"]).stream()))

            _stats_cache = {
                "users": users_count,
                "posts": posts_count,
                "reports": reports_count,
                "pendingReports": pending_reports,
                "pendingPosts": pending_posts,
                "sosReports": sos_reports,
                "last_updated": datetime.now().isoformat()
            }
            return _stats_cache
        except Exception as e:
            logger.error(f"Lỗi tính toán thống kê dashboard: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi thống kê: {str(e)}")
