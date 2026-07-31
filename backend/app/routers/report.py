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
    - Tự động phân loại priority, autoTags, trustScore, SLA deadline và sinh trackingCode.
    - Nếu báo cáo là SOS/HIGH, kích hoạt cảnh báo tới admin.
    """
    try:
        user = getattr(request.state, "user", None)
        reporter_info = user if user else None
        result = await FirestoreService.create_report(report_data.model_dump(exclude_none=True), reporter_info=reporter_info)
        return ApiResponse(
            success=True,
            message=f"Gửi báo cáo thành công! Mã tra cứu của bạn: {result.get('trackingCode')}",
            data=result
        )
    except HTTPException as exc:
        raise exc
    except Exception as e:
        logger.error(f"❌ Lỗi khi tạo báo cáo: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi gửi báo cáo. Vui lòng thử lại sau.")


@router.get("/reports/track/{tracking_code}", response_model=ApiResponse, summary="Tra cứu tiến độ báo cáo bằng tracking code")
async def track_report_status(tracking_code: str):
    """
    Cho phép học sinh/phụ huynh tra cứu minh bạch tiến độ xử lý báo cáo mà không cần đăng nhập hay lộ danh tính.
    """
    try:
        result = await FirestoreService.get_report_by_tracking_code(tracking_code)
        return ApiResponse(
            success=True,
            message="Tra cứu tiến độ báo cáo thành công",
            data=result
        )
    except HTTPException as exc:
        raise exc
    except Exception as e:
        logger.error(f"❌ Lỗi khi tra cứu báo cáo #{tracking_code}: {e}")
        raise HTTPException(status_code=500, detail="Không thể tra cứu thông tin báo cáo.")

