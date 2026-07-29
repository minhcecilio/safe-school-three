import logging
import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
            sender_email = os.getenv("SENDER_EMAIL", smtp_user)
            admin_emails = []
            env_admin_emails = os.getenv("ADMIN_NOTIFICATION_EMAIL")
            if env_admin_emails:
                admin_emails.extend([email.strip() for email in env_admin_emails.split(",") if email.strip()])

            if db:
                admins = db.collection("users").where("role", "==", "admin").stream()
                for admin_doc in admins:
                    admin_value = admin_doc.to_dict() or {}
                    email = admin_value.get("email")
                    if email:
                        admin_emails.append(email)

            admin_emails = list(dict.fromkeys([e for e in admin_emails if e]))
            if not admin_emails and smtp_user:
                admin_emails = [smtp_user]

            if smtp_server and smtp_user and smtp_password and sender_email and admin_emails:
                subject = f"[SafeSchool SOS ALERT] Báo cáo bạo lực khẩn cấp #{report_id}"
                body_lines = [
                    "Kính gửi Ban Quản Trị SafeSchool,",
                    "",
                    "Hệ thống phát hiện một báo cáo KHẨN CẤP (SOS):",
                    f"- Mã báo cáo: {report_id}",
                    f"- Tiêu đề: {report_data.get('title', 'N/A')}",
                    f"- Người báo cáo: {report_data.get('reporterName') or report_data.get('reporterId', 'N/A')}",
                    f"- Email người báo cáo: {report_data.get('user_email', 'N/A')}",
                    f"- Vị trí: {report_data.get('location', 'N/A')}",
                    f"- Mức độ ưu tiên: {report_data.get('priority', 'N/A')}",
                    f"- Nội dung: {report_data.get('description', 'N/A')}",
                    f"- Thời gian tạo: {report_data.get('createdAt', datetime.now().isoformat())}",
                    "",
                    "Vui lòng truy cập trang Quản Trị để xử lý ngay lập tức!",
                ]
                body = "\n".join(body_lines)

                msg = MIMEMultipart()
                msg["From"] = sender_email
                msg["To"] = ", ".join(admin_emails)
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain", "utf-8"))

                try:
                    if smtp_port == 465:
                        smtp_client = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=30)
                    else:
                        smtp_client = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
                        smtp_client.ehlo()
                        smtp_client.starttls()
                        smtp_client.ehlo()

                    with smtp_client:
                        smtp_client.login(smtp_user, smtp_password)
                        smtp_client.sendmail(sender_email, admin_emails, msg.as_string())
                    logger.info(f"📧 Đã gửi email cảnh báo SOS tới Admin: {admin_emails}")
                except Exception as mail_err:
                    logger.error(f"⚠️ Lỗi gửi email cảnh báo SOS qua SMTP: {mail_err}")

            return True
        except Exception as e:
            logger.error(f"❌ Lỗi khi xử lý cảnh báo SOS: {e}")
            return False
