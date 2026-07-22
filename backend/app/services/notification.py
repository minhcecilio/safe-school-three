import logging
import smtplib
import os
from datetime import datetime
from typing import Optional, Dict, Any
from app.config.firebase import get_firestore_db

logger = logging.getLogger("safeschool.notification")

class NotificationService:
    """Service xử lý gửi và lưu trữ thông báo hệ thống và cảnh báo SOS khẩn cấp"""

    @staticmethod
    async def create_notification(user_id: str, title: str, message: str, notification_type: str = "system") -> bool:
        """
        Lưu thông báo cho người dùng vào Firestore collection 'notifications'
        """
        try:
            db = get_firestore_db()
            if not db:
                logger.warning("Firestore DB chưa sẵn sàng để ghi thông báo.")
                return False

            notification_data = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "read": False,
                "createdAt": datetime.now().isoformat()
            }

            db.collection("notifications").add(notification_data)
            logger.info(f"🔔 Đã gửi thông báo thành công tới user [{user_id}]: {title}")
            return True
        except Exception as e:
            logger.error(f"❌ Lỗi khi gửi thông báo cho user [{user_id}]: {e}")
            return False

    @staticmethod
    async def send_sos_alert(report_id: str, report_data: Dict[str, Any]) -> bool:
        """
        Xử lý cảnh báo khẩn cấp đối với các báo cáo mang nhãn SOS.
        1. Gửi thông báo đến toàn bộ ban quản trị / admin.
        2. Tự động gửi Email thông báo khẩn cấp tới Email Admin qua SMTP (nếu cấu hình).
        """
        try:
            db = get_firestore_db()
            logger.critical(f"🚨 CẢNH BÁO SOS KHẨN CẤP! Mã Báo Cáo: {report_id} - Chi tiết: {report_data.get('title')}")

            if db:
                # 1. Tạo thông báo trong collection 'notifications' cho tất cả Admin
                admins = db.collection("users").where("role", "==", "admin").stream()
                for admin_doc in admins:
                    admin_id = admin_doc.id
                    await NotificationService.create_notification(
                        user_id=admin_id,
                        title="🚨 CẢNH BÁO BÁO CÁO SOS KHẨN CẤP",
                        message=f"Báo cáo SOS khẩn cấp #{report_id}: {report_data.get('title', 'Không có tiêu đề')}",
                        notification_type="sos_alert"
                    )

            # 2. Gửi Email thông báo khẩn cấp tới Admin (nếu cấu hình SMTP)
            smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")
            admin_email = os.getenv("ADMIN_NOTIFICATION_EMAIL", smtp_user)

            if smtp_server and smtp_user and smtp_password and admin_email:
                try:
                    subject = f"[SafeSchool SOS ALERT] Báo cáo bạo lực khẩn cấp #{report_id}"
                    body = (
                        f"Kính gửi Ban Quản Trị SafeSchool,\n\n"
                        f"Hệ thống phát hiện một báo cáo KHẨN CẤP (SOS):\n"
                        f"- Mã báo cáo: {report_id}\n"
                        f"- Tiêu đề: {report_data.get('title', 'N/A')}\n"
                        f"- Nội dung: {report_data.get('description', 'N/A')}\n"
                        f"- Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                        f"Vui lòng truy cập trang Quản Trị để xử lý ngay lập tức!"
                    )
                    email_text = f"Subject: {subject}\n\n{body}"

                    with smtplib.SMTP(smtp_server, smtp_port) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.sendmail(smtp_user, [admin_email], email_text.encode('utf-8'))
                    logger.info(f"📧 Đã gửi email cảnh báo SOS tới Admin: {admin_email}")
                except Exception as mail_err:
                    logger.error(f"⚠️ Lỗi gửi email cảnh báo SOS qua SMTP: {mail_err}")

            return True
        except Exception as e:
            logger.error(f"❌ Lỗi khi xử lý cảnh báo SOS: {e}")
            return False
