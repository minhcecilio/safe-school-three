import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from google.cloud import firestore
from fastapi import HTTPException, status
from firebase_admin import auth
from app.config.firebase import get_firestore_db
from app.services.notification import NotificationService
from app.services.classifier import ReportAutoClassifier

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
    async def update_user(uid: str, update_dict: Dict[str, Any], admin_uid: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Cập nhật trạng thái/vai trò của người dùng và ghi nhận nhật ký"""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Không có kết nối tới cơ sở dữ liệu")

        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User không tồn tại")

        #Lấy thông tin user
        user_data = user_doc.to_dict()
        user_email = user_data.get("email")
        user_display_name = user_data.get("displayName")
        
        # Thêm thời gian cập nhật
        update_payload = dict(update_dict)
        update_payload["updatedAt"] = datetime.now().isoformat()
        user_ref.update(update_payload)

        if "is_active" in update_dict and update_dict.get("is_active") is False:
            await NotificationService.create_notification(
                user_id=uid,
                title="🔒 Tài khoản của bạn đã bị khóa",
                message=f"Tài khoản của bạn đã bị khóa bởi quản trị viên. {f' Lý do: {reason}' if reason else ''}",
                notification_type="account_updated"
            )
            
        elif "role" in update_dict:
            await NotificationService.create_notification(
                user_id=uid,
                title="Cập nhật vai trò tài khoản",
                message=f"Vai trò của bạn đã được cập nhật thành {update_dict.get('role', 'mới')}.",
                notification_type="account_updated"
            )
        elif "is_active" in update_dict and update_dict.get("is_active") is True:
            await NotificationService.create_notification(
                user_id=uid,
                title="🔓 Tài khoản của bạn đã được mở khóa",
                message=f"Tài khoản của bạn đã được mở khóa bởi quản trị viên",
                notification_type="account_updated"
            )
        elif "is_anonymous" in update_dict:
            await NotificationService.create_notification(
                user_id=uid,
                title="Cập nhật trạng thái ẩn danh",
                message="Trạng thái ẩn danh của tài khoản đã được thay đổi.",
                notification_type="account_updated"
            )

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
    async def delete_user(uid: str, admin_uid: str, reason: Optional[str] = None) -> Dict[str, Any]:
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

    @staticmethod
    async def create_report(report_data: Dict[str, Any], reporter_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Antigravity Report Creator:
        - Tự động phân loại priority, autoTags, trustScore.
        - Gán SLA Deadline (Response: 2h, Resolution: 12-24h).
        - Sinh mã tra cứu công khai trackingCode (VD: SR-2026-889102).
        """
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Không có kết nối tới cơ sở dữ liệu")

        # Tự động phân loại & tính SLA bằng ReportAutoClassifier
        classification = await ReportAutoClassifier.classify(report_data, reporter_info)

        report_payload = {
            "title": report_data.get("title", "Báo cáo không có tiêu đề"),
            "description": report_data.get("description", ""),
            "priority": classification.get("priority", "NORMAL"),
            "type": report_data.get("type", "report"),
            "location": report_data.get("location", ""),
            "targetId": report_data.get("targetId", None),
            "status": "pending",
            "resolution": "",
            "trackingCode": classification.get("trackingCode"),
            "autoTags": classification.get("autoTags", []),
            "trustScore": classification.get("trustScore", 80),
            "sla": classification.get("sla"),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "sosAlertSent": False,
            "assignedTo": None,
            "assignedAt": None,
            "assignedBy": None,
            "assignedToName": None,
            "assignedToRole": None,
            "history": [{
                "action": "created", "from": None, "to": "pending",
                "actorUid": reporter_info.get("uid") if reporter_info else None,
                "note": "Báo cáo được tạo", "timestamp": datetime.now().isoformat()
            }],
            "progressNotes": [],
            "isDeleted": False,
            "deletedAt": None,
            "deletedBy": None,
            "purgeAt": None,
            "searchText": " ".join([
                str(report_data.get("title", "")), str(report_data.get("description", "")),
                str(report_data.get("location", "")), str(report_data.get("type", ""))
            ]).lower(),
        }

        if reporter_info:
            report_payload["reporterId"] = reporter_info.get("uid")
            report_payload["reporterName"] = reporter_info.get("name") or reporter_info.get("displayName") or reporter_info.get("email")
            report_payload["reporterEmail"] = reporter_info.get("email")

        try:
            report_ref = db.collection("reports").add(report_payload)
            report_id = report_ref[1].id if isinstance(report_ref, tuple) else report_ref.id
        except Exception as e:
            logger.error(f"❌ Lỗi khi lưu báo cáo vào Firestore: {e}")
            raise HTTPException(status_code=500, detail="Không thể lưu báo cáo vào hệ thống")

        created_report = {"id": report_id, **report_payload}

        # Đẩy thông báo phản hồi cho người gửi (kèm mã tra cứu)
        if reporter_info and reporter_info.get("uid"):
            await NotificationService.create_notification(
                user_id=reporter_info.get("uid"),
                title="✅ Báo cáo đã được tiếp nhận thành công",
                message=f"Báo cáo của bạn đã được tiếp nhận với Mã tra cứu: #{classification.get('trackingCode')}. Trạng thái: Đang chờ xử lý.",
                notification_type="report_created"
            )

        # Nếu là báo cáo SOS / HIGH priority -> Cảnh báo ngay lập tức
        if report_payload.get("priority") == "SOS" or report_payload.get("type") == "sos_emergency":
            await FirestoreService._send_pending_sos_alert(report_id, created_report)

        # Rule engine: tự động phân công theo loại báo cáo/từ khóa.
        auto_assignment = await FirestoreService.apply_assignment_rules(report_id, created_report)
        if auto_assignment:
            created_report.update(auto_assignment)

        return created_report

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

        # Đổi status thành 'approved' nếu được duyệt (để frontend bài viết đọc được status)
        final_status = "approved" if status_val == "approved" else status_val

        update_data = {
            "status": final_status,
            "visibility": "public" if status_val == "approved" else "private",
            "reviewedBy": admin_uid,
            "reviewedAt": datetime.now().isoformat(),
            "moderatedAt": datetime.now().isoformat(),
            "moderatedBy": admin_uid,
            "rejectionReason": reason or "",
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
            details={"status": final_status, "reason": reason}
        )

        return {"id": post_id, "status": status_val, "notificationSent": bool(author_id)}
    
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
    async def _send_pending_sos_alert(report_id: str, report_data: Dict[str, Any]) -> None:
        """Gửi email SOS một lần cho admin khi báo cáo SOS được phát hiện."""
        try:
            if str(report_data.get("priority", "")).upper() != "SOS":
                return
            if report_data.get("sosAlertSent") is True:
                return

            db = get_firestore_db()
            if not db:
                return

            sent = await NotificationService.send_sos_alert(report_id, report_data)
            if sent:
                db.collection("reports").document(report_id).update({"sosAlertSent": True})
        except Exception as e:
            logger.error(f"❌ Lỗi khi gửi email SOS cho báo cáo {report_id}: {e}")

    @staticmethod
    async def get_all_reports(status_filter: str = "all", priority_filter: str = "all") -> List[Dict[str, Any]]:
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
                report_type = str(data.get("type", "")).lower()
                report_priority = str(data.get("priority", "")).upper()
                is_sos_report = report_type == "sos_emergency" or report_priority == "SOS"

                if priority_filter != "all":
                    priority_filter_norm = priority_filter.lower()
                    if priority_filter_norm == "sos":
                        if not is_sos_report:
                            continue
                    elif report_priority.lower() != priority_filter_norm:
                        continue

                data["id"] = doc.id
                data["priority"] = "SOS" if is_sos_report else data.get("priority", "normal")

                created = data.get("createdAt")
                if hasattr(created, "toDate"):
                    data["createdAt"] = created.toDate().isoformat()
                elif hasattr(created, "isoformat"):
                    data["createdAt"] = created.isoformat()
                elif not created:
                    data["createdAt"] = datetime.now().isoformat()

                reports.append(data)

                if is_sos_report and data.get("sosAlertSent") is not True:
                    await FirestoreService._send_pending_sos_alert(doc.id, data)

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
    async def get_available_handlers() -> List[Dict[str, Any]]:
        """Danh sách người có thể xử lý, kèm workload và chuyên môn."""
        db = get_firestore_db()
        if not db:
            return []
        handlers = []
        for doc in db.collection("users").stream():
            data = doc.to_dict() or {}
            role = str(data.get("role", "")).lower()
            if role in {"admin", "psychologist", "counselor", "teacher"} and data.get("is_active", True):
                handlers.append({
                    "uid": doc.id,
                    "displayName": data.get("displayName") or data.get("name") or data.get("email") or "Chưa đặt tên",
                    "email": data.get("email", ""), "role": role,
                    "workload": int(data.get("workload", 0) or 0),
                    "expertise": data.get("expertise", []),
                    "handledTypeStats": data.get("handledTypeStats", {})
                })
        return sorted(handlers, key=lambda x: (x["workload"], x["displayName"]))

    @staticmethod
    def _history_entry(action: str, actor_uid: str, old_value: Any = None,
                       new_value: Any = None, note: str = "") -> Dict[str, Any]:
        return {"action": action, "from": old_value, "to": new_value,
                "actorUid": actor_uid, "note": note or "", "timestamp": datetime.now(timezone.utc).isoformat()}

    @staticmethod
    async def assign_report(report_id: str, assignee_id: str, admin_uid: str, note: str = "") -> Dict[str, Any]:
        db = get_firestore_db()
        report_ref = db.collection("reports").document(report_id)
        report_doc = report_ref.get()
        user_ref = db.collection("users").document(assignee_id)
        user_doc = user_ref.get()
        if not report_doc.exists: raise HTTPException(404, "Báo cáo không tồn tại")
        if not user_doc.exists: raise HTTPException(404, "Người xử lý không tồn tại")
        report = report_doc.to_dict() or {}; user = user_doc.to_dict() or {}
        role = str(user.get("role", "")).lower()
        if role not in {"admin", "psychologist", "counselor", "teacher"}:
            raise HTTPException(400, "Tài khoản không có quyền xử lý báo cáo")
        old_assignee = report.get("assignedTo"); now = datetime.now(timezone.utc).isoformat()
        history = list(report.get("history", []))
        history.append(FirestoreService._history_entry("assignment", admin_uid, old_assignee, assignee_id, note))
        batch = db.batch()
        batch.update(report_ref, {"assignedTo": assignee_id,
            "assignedToName": user.get("displayName") or user.get("name") or user.get("email"),
            "assignedToRole": role, "assignedAt": now, "assignedBy": admin_uid,
            "status": "processing" if report.get("status") == "pending" else report.get("status", "processing"),
            "updatedAt": now, "updatedBy": admin_uid, "history": history})
        if old_assignee and old_assignee != assignee_id:
            batch.update(db.collection("users").document(old_assignee), {"workload": firestore.Increment(-1)})
        if old_assignee != assignee_id:
            batch.update(user_ref, {"workload": firestore.Increment(1)})
        batch.commit()
        await NotificationService.create_notification(assignee_id, "📋 Báo cáo mới được giao",
            f"Bạn được phân công xử lý báo cáo #{report.get('trackingCode', report_id[:6])}.", "report_assigned")
        await FirestoreService.log_admin_action(admin_uid, "ASSIGN_REPORT", "report", report_id,
            {"from": old_assignee, "to": assignee_id, "note": note})
        return {"id": report_id, "assignedTo": assignee_id, "assignedAt": now, "workload": int(user.get("workload", 0))+1}

    @staticmethod
    async def update_report_status(report_id: str, status_val: str, resolution: Optional[str], admin_uid: str,
                                   assigned_to: Optional[str] = None, assigned_to_name: Optional[str] = None,
                                   assigned_to_role: Optional[str] = None, progress_note: Optional[str] = None) -> Dict[str, Any]:
        if assigned_to:
            await FirestoreService.assign_report(report_id, assigned_to, admin_uid, progress_note or "")
        db = get_firestore_db(); ref = db.collection("reports").document(report_id); snap = ref.get()
        if not snap.exists: raise HTTPException(404, "Báo cáo không tồn tại")
        data = snap.to_dict() or {}; old_status = data.get("status", "pending")
        if status_val not in {"pending", "processing", "resolved", "rejected"}: raise HTTPException(400, "Trạng thái không hợp lệ")
        now = datetime.now(timezone.utc).isoformat(); history = list(data.get("history", []))
        history.append(FirestoreService._history_entry("status", admin_uid, old_status, status_val, progress_note or resolution or ""))
        updates = {"status": status_val, "updatedAt": now, "updatedBy": admin_uid, "history": history}
        if resolution is not None: updates["resolution"] = resolution
        if progress_note:
            notes = list(data.get("progressNotes", [])); notes.append({"note": progress_note, "updatedBy": admin_uid, "timestamp": now, "status": status_val}); updates["progressNotes"] = notes
        if status_val == "resolved": updates["resolvedAt"] = now
        ref.update(updates)
        if old_status != "resolved" and status_val in {"resolved", "rejected"} and data.get("assignedTo"):
            db.collection("users").document(data["assignedTo"]).update({"workload": firestore.Increment(-1)})
        await NotificationService.send_report_status_notification(data.get("reporterId"), report_id, data.get("trackingCode", report_id[:6]), status_val, resolution or progress_note or "")
        await FirestoreService.log_admin_action(admin_uid, "UPDATE_REPORT_STATUS", "report", report_id, updates)
        return {"id": report_id, "status": status_val, "updatedAt": now}

    @staticmethod
    async def soft_delete_report(report_id: str, admin_uid: str) -> Dict[str, Any]:
        db = get_firestore_db(); ref = db.collection("reports").document(report_id); snap = ref.get()
        if not snap.exists: raise HTTPException(404, "Báo cáo không tồn tại")
        data=snap.to_dict() or {}; now=datetime.now(timezone.utc); history=list(data.get("history", []))
        history.append(FirestoreService._history_entry("soft_delete", admin_uid, False, True, "Chuyển vào thùng rác"))
        ref.update({"isDeleted": True, "deletedAt": now.isoformat(), "deletedBy": admin_uid,
                    "purgeAt": (now+timedelta(days=30)).isoformat(), "updatedAt": now.isoformat(), "history": history})
        if data.get("assignedTo") and data.get("status") not in {"resolved", "rejected"}:
            db.collection("users").document(data["assignedTo"]).update({"workload": firestore.Increment(-1)})
        return {"id": report_id, "isDeleted": True, "restoreUntil": (now+timedelta(days=30)).isoformat()}

    @staticmethod
    async def restore_report(report_id: str, admin_uid: str) -> Dict[str, Any]:
        db=get_firestore_db(); ref=db.collection("reports").document(report_id); snap=ref.get()
        if not snap.exists: raise HTTPException(404, "Báo cáo không tồn tại")
        data=snap.to_dict() or {}
        if not data.get("isDeleted"): raise HTTPException(400, "Báo cáo chưa bị xóa")
        history=list(data.get("history", [])); history.append(FirestoreService._history_entry("restore", admin_uid, True, False, "Khôi phục từ thùng rác"))
        now=datetime.now(timezone.utc).isoformat(); ref.update({"isDeleted": False, "deletedAt": None, "deletedBy": None, "purgeAt": None, "updatedAt": now, "history": history})
        if data.get("assignedTo") and data.get("status") not in {"resolved", "rejected"}:
            db.collection("users").document(data["assignedTo"]).update({"workload": firestore.Increment(1)})
        return {"id": report_id, "isDeleted": False, "restoredAt": now}

    @staticmethod
    async def search_reports(q: str = "", status_filter: str = "all", assignee: str = "", report_type: str = "",
                             priority: str = "all", date_from: str = "", date_to: str = "", include_deleted: bool = False,
                             sort_by: str = "createdAt", sort_order: str = "desc") -> List[Dict[str, Any]]:
        db=get_firestore_db(); rows=[]; needle=(q or "").strip().lower()
        for doc in db.collection("reports").stream():
            d=doc.to_dict() or {}; d["id"]=doc.id
            if bool(d.get("isDeleted", False)) != bool(include_deleted): continue
            if status_filter != "all" and d.get("status") != status_filter: continue
            if assignee and d.get("assignedTo") != assignee: continue
            if report_type and d.get("type") != report_type: continue
            if priority != "all" and str(d.get("priority", "")).lower() != priority.lower(): continue
            created=str(d.get("createdAt", ""))
            if date_from and created < date_from: continue
            if date_to and created > date_to + "T23:59:59": continue
            haystack=d.get("searchText") or " ".join(str(d.get(k,"")) for k in ("title","description","location","trackingCode","autoTags")).lower()
            if needle and needle not in haystack: continue
            rows.append(d)
        rows.sort(key=lambda x: str(x.get(sort_by, "")), reverse=sort_order != "asc")
        return rows

    @staticmethod
    async def apply_assignment_rules(report_id: str, report: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Áp dụng rule đang hoạt động; rule priority nhỏ hơn được xét trước."""
        db = get_firestore_db()
        text = (str(report.get("title", "")) + " " + str(report.get("description", ""))).lower()
        report_type = str(report.get("type", "")).lower()
        rules = []
        for doc in db.collection("assignment_rules").stream():
            rule = doc.to_dict() or {}; rule["id"] = doc.id
            if rule.get("isActive", True): rules.append(rule)
        rules.sort(key=lambda r: int(r.get("priority", 100)))
        for rule in rules:
            type_match = not rule.get("reportType") or str(rule.get("reportType")).lower() == report_type
            keywords = [str(k).lower().strip() for k in rule.get("keywords", []) if str(k).strip()]
            keyword_match = not keywords or any(k in text for k in keywords)
            if type_match and keyword_match and rule.get("assigneeId"):
                result = await FirestoreService.assign_report(report_id, rule["assigneeId"], "system:auto-rule",
                    f"Tự động phân công theo rule: {rule.get('name', rule['id'])}")
                result["assignmentRuleId"] = rule["id"]
                return result
        return None

    @staticmethod
    async def suggest_assignees(report_id: str) -> List[Dict[str, Any]]:
        db=get_firestore_db(); snap=db.collection("reports").document(report_id).get()
        if not snap.exists: raise HTTPException(404, "Báo cáo không tồn tại")
        report=snap.to_dict() or {}; text=(str(report.get("title",""))+" "+str(report.get("description",""))).lower(); typ=str(report.get("type","")).lower()
        psychological=any(k in text for k in ["tâm lý","trầm cảm","lo âu","cô lập","bắt nạt","khủng hoảng"])
        physical=any(k in text for k in ["đánh","bạo lực","vũ khí","xô xát","tấn công"])
        result=[]
        for h in await FirestoreService.get_available_handlers():
            score=50; reasons=[]; role=h["role"]
            if psychological and role in {"psychologist","counselor"}: score+=30; reasons.append("phù hợp chuyên môn tâm lý")
            if physical and role in {"admin","teacher"}: score+=25; reasons.append("phù hợp xử lý bạo lực thể chất")
            if typ in (h.get("handledTypeStats") or {}): score+=min(15, int(h["handledTypeStats"].get(typ,0))); reasons.append("đã xử lý trường hợp tương tự")
            score-=min(35, h["workload"]*5); reasons.append(f"đang xử lý {h['workload']} báo cáo")
            result.append({**h, "matchScore": max(0,min(100,score)), "matchReason": ", ".join(reasons)})
        return sorted(result, key=lambda x: (-x["matchScore"], x["workload"]))

    @staticmethod
    async def get_report_by_tracking_code(tracking_code: str) -> Dict[str, Any]:
        """Cho phép người dùng tra cứu tiến độ xử lý báo cáo thông qua trackingCode công khai."""
        db = get_firestore_db()
        if not db:
            raise HTTPException(status_code=500, detail="Cơ sở dữ liệu chưa sẵn sàng")

        reports_ref = db.collection("reports").where("trackingCode", "==", tracking_code.strip()).limit(1).stream()
        reports = list(reports_ref)

        if not reports:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy báo cáo với mã tra cứu: {tracking_code}")

        doc = reports[0]
        data = doc.to_dict() or {}
        sla = data.get("sla", {}) or {}
        now_str = datetime.now().isoformat()
        
        sla_status = "In SLA"
        if sla.get("isResponseOverdue") or sla.get("isResolutionOverdue"):
            sla_status = "Escalated SLA"

        return {
            "trackingCode": data.get("trackingCode", tracking_code),
            "title": data.get("title", ""),
            "status": data.get("status", "pending"),
            "priority": data.get("priority", "NORMAL"),
            "resolution": data.get("resolution", ""),
            "createdAt": data.get("createdAt", ""),
            "updatedAt": data.get("updatedAt", ""),
            "slaStatus": sla_status
        }

    @staticmethod
    async def delete_report(report_id: str, admin_uid: str) -> Dict[str, Any]:
        """Tương thích API cũ: chuyển sang xóa mềm."""
        return await FirestoreService.soft_delete_report(report_id, admin_uid)

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
            sos_reports = 0
            for report_doc in db.collection("reports").stream():
                doc_data = report_doc.to_dict() or {}
                if str(doc_data.get("priority", "")).upper() == "SOS" or str(doc_data.get("type", "")).lower() == "sos_emergency":
                    sos_reports += 1

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