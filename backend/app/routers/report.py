import logging
from fastapi import APIRouter, Request, HTTPException
from app.models.schemas import ApiResponse, ReportCreate
from app.services.firestore import FirestoreService

logger = logging.getLogger("safeschool.router.report")

router = APIRouter(
    prefix="/api",
    tags=["Reports"]
)


@router.post("/reports", response_model=ApiResponse, summary="Gửi báo cáo vi phạm hoặc SOS")
async def create_report(report_data: ReportCreate, request: Request):
    """
    Gửi một báo cáo mới vào hệ thống.
    - Nếu người dùng đã đăng nhập, hệ thống sẽ lưu reporterId và reporterName từ token.
    - Nếu báo cáo là SOS, hệ thống sẽ kích hoạt cảnh báo SOS tới admin.
    """
    try:
        user = getattr(request.state, "user", None)
        reporter_info = user if user else None
        result = await FirestoreService.create_report(report_data.model_dump(exclude_none=True), reporter_info=reporter_info)
        return ApiResponse(
            success=True,
            message="Gửi báo cáo thành công",
            data=result
        )
    except HTTPException as exc:
        raise exc
    except Exception as e:
        logger.error(f"❌ Lỗi khi tạo báo cáo: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi gửi báo cáo. Vui lòng thử lại sau.")
