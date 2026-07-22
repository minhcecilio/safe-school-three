import logging
import sys
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config.firebase import init_firebase
from app.dependencies.auth import AuthMiddleware
from app.routers.admin import router as admin_router

# ==================== CẤU HÌNH LOGGING ====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("safeschool.main")

# ==================== KHỞI TẠO FASTAPI APP ====================
app = FastAPI(
    title="SafeSchool API Backend",
    description="Hệ thống Backend kết nối Firebase Admin SDK & Firestore cho giải pháp Phòng chống bạo lực học đường",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ==================== CẤU HÌNH CORS FOR REACT FRONTEND ====================
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MIDDLEWARE XÁC THỰC TOKEN TỰ ĐỘNG ====================
app.add_middleware(AuthMiddleware)

# ==================== MIDDLEWARE LOGGING ADMIN REQUESTS ====================
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """Logging chi tiết cho tất cả các request gửi tới Admin APIs"""
    if request.url.path.startswith("/api/admin"):
        user = getattr(request.state, "user", None)
        user_uid = user.get("uid") if user else "Anonymous"
        logger.info(f"🌐 [HTTP ADMIN] {request.method} {request.url.path} | Admin UID: {user_uid} | Client: {request.client.host}")
    
    response = await call_next(request)
    return response

# ==================== GLOBAL EXCEPTION HANDLERS ====================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Xử lý ngoại lệ HTTP chuẩn hóa response JSON"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "data": None
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Bắt và xử lý tất cả các lỗi chưa được lường trước (Global Exception Handler)"""
    logger.error(f"💥 Lỗi hệ thống chưa được xử lý tại {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": f"Lỗi máy chủ nội bộ: {str(exc)}",
            "data": None
        }
    )

# ==================== KHỞI ĐỘNG FIREBASE KHI APP CHẠY ====================
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Đang khởi động SafeSchool FastAPI Server...")
    init_firebase()

# ==================== NỐI ROUTERS ====================
app.include_router(admin_router)

# ==================== ROOT ENDPOINT ====================
@app.get("/", tags=["System"])
async def root():
    return {
        "success": True,
        "name": "SafeSchool API System",
        "version": "2.0.0",
        "status": "Online",
        "swagger_docs": "/docs",
        "redoc_docs": "/redoc"
    }

# ==================== CHẠY APP SERVER ====================
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
