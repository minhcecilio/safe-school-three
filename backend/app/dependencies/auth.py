import logging
from fastapi import Request, HTTPException, status, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from firebase_admin import auth
from app.config.firebase import get_firestore_db

logger = logging.getLogger("safeschool.auth")

class AuthMiddleware(BaseHTTPMiddleware):
    """
    Antigravity Middleware: Tự động kiểm tra Token ở tầng Middleware HTTP.
    Giúp mã nguồn sạch sẽ, không cần parse/verify token thủ công ở từng router handler.
    """
    async def dispatch(self, request: Request, call_next):
        # Mặc định gán user state là None
        request.state.user = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]
            try:
                # Token verification từ Firebase Admin SDK
                decoded_token = auth.verify_id_token(token)
                request.state.user = decoded_token
            except Exception as e:
                logger.warning(f"🔑 [AUTH MIDDLEWARE] Token không hợp lệ hoặc hết hạn: {e}")
                # Không ngắt request ngay tại middleware đối với public routes, ngoại trừ routes /api/admin/
                if request.url.path.startswith("/api/admin"):
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"success": False, "detail": "Token xác thực không hợp lệ hoặc đã hết hạn"}
                    )

        # Kiểm tra nếu truy cập route /api/admin mà không mang Token
        elif request.url.path.startswith("/api/admin") and request.method != "OPTIONS":
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "detail": "Yêu cầu Header Authorization với Bearer Token"}
            )

        response = await call_next(request)
        return response


async def get_current_user(request: Request) -> dict:
    """
    Dependency lấy thông tin user đã được xác thực từ Middleware request state.
    """
    user = getattr(request.state, "user", None)
    if not user:
        # Fallback kiểm tra header nếu gọi trực tiếp dependency
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]
            try:
                user = auth.verify_id_token(token)
                request.state.user = user
            except Exception:
                pass

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng chưa được xác thực (Token không hợp lệ)"
        )
    return user


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> str:
    """
    Antigravity Authorization Dependency: Kiểm tra vai trò 'admin' của user từ Firestore.
    Chỉ admin mới được truy cập các endpoint nhạy cảm. Trả về uid của Admin.
    """
    uid = current_user.get("uid")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không chứa UID hợp lệ")

    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Không thể kết nối tới cơ sở dữ liệu")

    # Kiểm tra Firestore role
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        # Kiểm tra nếu role có trong custom claims của Firebase token
        if current_user.get("role") == "admin" or current_user.get("admin") is True:
            return uid
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tài khoản không tồn tại trong hệ thống")

    user_data = user_doc.to_dict()
    user_role = user_data.get("role", "").lower()
    is_active = user_data.get("is_active", True)

    if not is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản của bạn đã bị khóa")

    if user_role != "admin" and not current_user.get("admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Truy cập bị từ chối.Yêu cầu quyền Admin")

    return uid
