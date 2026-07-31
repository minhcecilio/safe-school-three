import logging
from datetime import datetime
from typing import Dict, Any, List
from app.config.firebase import get_firestore_db
from app.services.notification import NotificationService

logger = logging.getLogger("safeschool.sla_worker")

class SLAEscalationEngine:
    """Tự động quét và leo thang (Escalate) các báo cáo vi phạm thời gian cam kết dịch vụ (SLA)"""

    @staticmethod
    async def check_and_escalate_reports() -> Dict[str, Any]:
        """
        Quét danh sách báo cáo pending và processing:
        - Báo cáo pending vượt quá responseDeadline (2h) -> Tự động chuyển priority = SOS, isEscalated = True
        - Báo cáo processing vượt quá resolutionDeadline (24h) -> Tự động đánh dấu isResolutionOverdue = True
        - Gửi cảnh báo email leo thang tới Ban Giám Hiệu
        """
        db = get_firestore_db()
        if not db:
            logger.warning("Firestore DB chưa sẵn sàng cho SLA Engine.")
            return {"processed": 0, "escalated": 0}

        now_str = datetime.now().isoformat()
        escalated_count = 0
        processed_count = 0

        try:
            # 1. Kiểm tra các báo cáo PENDING quá hạn tiếp nhận (2h)
            pending_docs = db.collection("reports").where("status", "==", "pending").stream()
            for doc in pending_docs:
                processed_count += 1
                data = doc.to_dict() or {}
                report_id = doc.id
                sla = data.get("sla", {}) or {}
                response_deadline = sla.get("responseDeadline")

                if response_deadline and response_deadline < now_str and not sla.get("isResponseOverdue"):
                    logger.warning(f"🚨 [SLA VIOLATION] Báo cáo #{report_id} quá hạn tiếp nhận 2h!")
                    escalated_count += 1
                    
                    updates = {
                        "priority": "SOS",
                        "sla.isResponseOverdue": True,
                        "sla.isEscalated": True,
                        "sla.escalatedAt": now_str,
                        "updatedAt": now_str
                    }
                    db.collection("reports").document(report_id).update(updates)

                    # Gửi thông báo leo thang cho Admin / Ban Giám Hiệu
                    await NotificationService.send_sla_escalation_alert(report_id, {
                        **data,
                        "escalationReason": "Quá hạn 2 giờ chưa được Admin tiếp nhận xử lý"
                    })

            # 2. Kiểm tra các báo cáo PROCESSING quá hạn giải quyết (24h)
            processing_docs = db.collection("reports").where("status", "==", "processing").stream()
            for doc in processing_docs:
                processed_count += 1
                data = doc.to_dict() or {}
                report_id = doc.id
                sla = data.get("sla", {}) or {}
                resolution_deadline = sla.get("resolutionDeadline")

                if resolution_deadline and resolution_deadline < now_str and not sla.get("isResolutionOverdue"):
                    logger.warning(f"⏰ [SLA OVERDUE] Báo cáo #{report_id} xử lý quá 24h chưa hoàn tất!")
                    escalated_count += 1

                    updates = {
                        "sla.isResolutionOverdue": True,
                        "sla.isEscalated": True,
                        "sla.escalatedAt": now_str,
                        "updatedAt": now_str
                    }
                    db.collection("reports").document(report_id).update(updates)

                    await NotificationService.send_sla_escalation_alert(report_id, {
                        **data,
                        "escalationReason": "Quá hạn 24 giờ xử lý chưa hoàn tất giải quyết"
                    })

            logger.info(f"✅ [SLA ENGINE] Hoàn tất kiểm tra: Đã quét {processed_count} báo cáo, leo thang {escalated_count} báo cáo.")
            return {"processed": processed_count, "escalated": escalated_count}

        except Exception as e:
            logger.error(f"❌ Lỗi trong quá trình kiểm tra SLA Engine: {e}")
            return {"processed": processed_count, "escalated": escalated_count, "error": str(e)}
