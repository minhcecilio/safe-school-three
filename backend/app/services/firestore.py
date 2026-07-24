import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from google.cloud import firestore
from fastapi import HTTPException, status
from firebase_admin import auth
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

    @staticmethod
    async def delete_user(uid: str, admin_uid: str) -> Dict[str, Any]:
        """Xóa vĩnh viễn tài khoản người dùng khỏi Firestore và Firebase Auth"""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Không có kết nối tới cơ sở dữ liệu")

        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User không tồn tại")

        # 1. Xóa trong Firebase Auth
        try:
            auth.delete_user(uid)
            logger.info(f"🗑️ Đã xóa user [{uid}] trong Firebase Auth")
        except Exception as auth_err:
            logger.warning(f"⚠️ Không thể xóa user [{uid}] trong Firebase Auth: {auth_err}")

        # 2. Xóa document user trong Firestore
        user_ref.delete()

        # 3. Log hành động admin
        await FirestoreService.log_admin_action(
            admin_uid=admin_uid,
            action="DELETE_USER",
            target_type="user",
            target_id=uid,
            details={"deleted_user_uid": uid}
        )

        return {"uid": uid, "deleted": True}

    # ==================== QUẢN LÝ BÀI VIẾT / ARTICLES ====================

    @staticmethod
    async def get_all_posts(status_filter: str = "all") -> List[Dict[str, Any]]:
        """Lấy danh sách bài viết/bài báo từ các collection 'articles' và 'posts'"""
        db = get_firestore_db()
        if not db:
            return []

        try:
            posts = []
            seen_ids = set()

            # Quét collection 'articles' (chính) 
            docs = db.collection("articles").stream()

            for doc in docs:
                if doc.id in seen_ids:
                    continue
                seen_ids.add(doc.id)

                data = doc.to_dict()
                if data.get("isDeleted") is True:
                    continue

                data["id"] = doc.id
                data["collection_type"] = "articles"

                # Chuẩn hóa status: 'published' hoặc 'approved' -> 'approved'
                raw_status = data.get("status", "pending")
                if raw_status == "published":
                    raw_status = "approved"
                data["status"] = raw_status

                # Chuẩn hóa createdAt
                created = data.get("createdAt")
                if hasattr(created, "toDate"):
                    data["createdAt"] = created.toDate().isoformat()
                elif hasattr(created, "isoformat"):
                    data["createdAt"] = created.isoformat()
                elif not created:
                    data["createdAt"] = datetime.now().isoformat()

                posts.append(data)

            # Lọc theo status nếu status_filter != 'all'
            if status_filter != "all":
                posts = [p for p in posts if p.get("status") == status_filter]

            # Sắp xếp theo ngày tạo mới nhất ở trên
            posts.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
            return posts
        except Exception as e:
            logger.error(f"Lỗi lấy danh sách bài viết: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy bài viết: {str(e)}")

    @staticmethod
    async def approve_or_reject_post(post_id: str, status_val: str, reason: Optional[str], admin_uid: str) -> Dict[str, Any]:
        """Duyệt hoặc từ chối bài viết từ collection 'articles' hoặc 'posts'"""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Cơ sở dữ liệu chưa sẵn sàng")

        # Tìm trong 'articles' trước, sau đó 'posts'
        post_ref = db.collection("articles").document(post_id)
        post_doc = post_ref.get()

        if not post_doc.exists:
            post_ref = db.collection("posts").document(post_id)
            post_doc = post_ref.get()

        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

        post_data = post_doc.to_dict()
        author_id = post_data.get("authorId") or post_data.get("uid")

        # Đổi status thành 'published' nếu được duyệt (để frontend bài viết đọc được status)
        final_status = "published" if status_val == "approved" else status_val

        update_data = {
            "status": final_status,
            "moderatedAt": datetime.now().isoformat(),
            "moderatedBy": admin_uid,
            "reason": reason or "",
            "rejectionReason": reason or ""
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
            details={"status": final_status, "reason": reason}
        )

        return {"id": post_id, "status": status_val}
    
    @staticmethod
    async def delete_post(post_id: str, admin_uid: str) -> Dict[str, Any]:
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Không có kết nối tới cơ sở dữ liệu")
        
        post_ref = db.collection("articles").document(post_id)
        post_doc = post_ref.get()
        collection_name = "articles"
        
        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")
        
        post_data = post_doc.to_dict()
        post_title = post_data.get("title", "không có tiêu đề")
        author_id = post_data.get("authorID") or post_data.get("uid")
        
        # Xóa document trong Firestore
        post_ref.delete()
        
        # Ghi log hành động admin
        await FirestoreService.log_admin_action(
            admin_uid=admin_uid,
            action="DELETE_POST",
            target_type="post",
            target_id=post_id,
            details={
                "post_title": post_title,
                "collection": collection_name,
                "deleted_at": datetime.now().isoformat()
            }
        )
        
        # Gửi thông báo cho tác giả
        if author_id:
            await NotificationService.create_notification(
                user_id=author_id,
                title="🔈 Bài viết của bạn đã bị xóa",
                message=f"Bài viết '{post_title}' của bạn đã bị admin xóa khỏi hệ thống",
                notification_type="post_deleted"
            )
            
        return {
            "post_id": post_id,
            "title": post_title,
            "deleted": True,
            "collection": collection_name
        }

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
        """
        global _stats_cache
        db = get_firestore_db()
        if not db:
            return _stats_cache

        try:
            users_count = len(list(db.collection("users").stream()))

            # Đếm bài viết từ cả articles và posts
            articles_docs = list(db.collection("articles").stream())
            posts_docs = list(db.collection("posts").stream())
            seen_ids = set()
            all_posts = []
            for d in articles_docs + posts_docs:
                if d.id not in seen_ids:
                    seen_ids.add(d.id)
                    dt = d.to_dict()
                    if not dt.get("isDeleted"):
                        all_posts.append(dt)

            posts_count = len(all_posts)
            pending_posts = len([p for p in all_posts if p.get("status") == "pending"])

            reports_count = len(list(db.collection("reports").stream()))
            pending_reports = len(list(db.collection("reports").where("status", "==", "pending").stream()))
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
