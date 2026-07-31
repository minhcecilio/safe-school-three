import re
import random
import string
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.config.firebase import get_firestore_db

logger = logging.getLogger("safeschool.classifier")

# Bộ từ khóa nhận diện nguy cơ cao & khẩn cấp (Antigravity NLP Keyword Engine)
SOS_KEYWORDS = [
    "đánh", "chém", "tấn công", "máu", "dao", "vũ khí", "tự tử", "bắt cóc",
    "cứu với", "khẩn cấp", "xâm hại", "bắt giữ", "hiếp", "nguy hiểm", "bị thương"
]

HIGH_KEYWORDS = [
    "chửi", "dọa", "bắt nạt", "tống tiền", "đe dọa", "cô lập", "quay lén",
    "nhục mạ", "ép buộc", "đòi tiền", "chửi bới", "bốc phốt", "tẩy chay"
]

class ReportAutoClassifier:
    """Bộ máy phân loại báo cáo tự động & tính toán SLA theo tư duy Antigravity"""

    @staticmethod
    def generate_tracking_code() -> str:
        """Tạo mã tra cứu duy nhất cho người dùng (Ví dụ: SR-2026-889102)"""
        year = datetime.now().year
        rand_num = ''.join(random.choices(string.digits, k=6))
        return f"SR-{year}-{rand_num}"

    @staticmethod
    async def classify(report_data: Dict[str, Any], reporter_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Phân tích tự động:
        1. Quét từ khóa độc hại trong tiêu đề và nội dung.
        2. Đánh giá tần suất báo cáo của cùng 1 người dùng trong thời gian ngắn (10 phút).
        3. Kiểm tra địa điểm xảy ra sự việc xem có phải là "Điểm nóng sự cố" (Hotspot) hay không.
        4. Thiết lập thời hạn giải quyết SLA chuẩn.
        """
        title = str(report_data.get("title", "")).lower()
        description = str(report_data.get("description", "")).lower()
        location = str(report_data.get("location", "")).strip()
        report_type = str(report_data.get("type", "report")).lower()
        full_text = f"{title} {description}"

        auto_tags: List[str] = []
        calculated_priority = "NORMAL"

        # 1. Quét từ khóa
        for kw in SOS_KEYWORDS:
            if kw in full_text:
                calculated_priority = "SOS"
                auto_tags.append(kw)

        if calculated_priority != "SOS":
            for kw in HIGH_KEYWORDS:
                if kw in full_text:
                    calculated_priority = "HIGH"
                    auto_tags.append(kw)

        # Ưu tiên trực tiếp nếu người dùng gửi dạng SOS emergency
        if report_type == "sos_emergency":
            calculated_priority = "SOS"
            auto_tags.append("báo cáo khẩn cấp")

        db = get_firestore_db()
        now = datetime.now()

        # 2. Đánh giá tần suất báo cáo (Frequency Check)
        if db and reporter_info and reporter_info.get("uid"):
            reporter_id = reporter_info.get("uid")
            ten_mins_ago = (now - timedelta(minutes=10)).isoformat()
            try:
                recent_reports = db.collection("reports")\
                    .where("reporterId", "==", reporter_id)\
                    .where("createdAt", ">=", ten_mins_ago)\
                    .stream()
                recent_count = sum(1 for _ in recent_reports)
                if recent_count >= 2:
                    calculated_priority = "SOS" if calculated_priority in ["HIGH", "SOS"] else "HIGH"
                    auto_tags.append("tần suất cao (lặp lại)")
            except Exception as e:
                logger.warning(f"Không thể kiểm tra tần suất người dùng: {e}")

        # 3. Kiểm tra Điểm nóng Địa điểm (Hotspot Check)
        if db and location:
            try:
                one_day_ago = (now - timedelta(hours=24)).isoformat()
                location_reports = db.collection("reports")\
                    .where("location", "==", location)\
                    .where("createdAt", ">=", one_day_ago)\
                    .stream()
                loc_count = sum(1 for _ in location_reports)
                if loc_count >= 3:
                    if calculated_priority in ["NORMAL", "LOW"]:
                        calculated_priority = "HIGH"
                    auto_tags.append(f"điểm nóng: {location}")
            except Exception as e:
                logger.warning(f"Không thể kiểm tra điểm nóng địa điểm: {e}")

        # 4. Gán thời hạn SLA chuẩn
        response_hours = 2 if calculated_priority in ["SOS", "HIGH"] else 4
        resolution_hours = 12 if calculated_priority in ["SOS", "HIGH"] else 24

        sla_data = {
            "responseDeadline": (now + timedelta(hours=response_hours)).isoformat(),
            "resolutionDeadline": (now + timedelta(hours=resolution_hours)).isoformat(),
            "isResponseOverdue": False,
            "isResolutionOverdue": False,
            "isEscalated": False,
            "escalatedAt": None,
            "escalatedTo": []
        }

        tracking_code = ReportAutoClassifier.generate_tracking_code()
        trust_score = 90 if reporter_info and not reporter_info.get("is_anonymous") else 75

        return {
            "priority": calculated_priority,
            "autoTags": list(set(auto_tags)),
            "sla": sla_data,
            "trackingCode": tracking_code,
            "trustScore": trust_score
        }
