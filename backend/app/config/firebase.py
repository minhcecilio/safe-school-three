import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore, auth

logger = logging.getLogger("safeschool.firebase")

# ==================== KẾT NỐI FIREBASE ADMIN SDK ====================
db = None
firebase_app = None

def init_firebase():
    """
    Khởi tạo ứng dụng Firebase Admin SDK sử dụng serviceAccountKey.json.
    Nếu đã khởi tạo trước đó, trả về ứng dụng hiện tại.
    """
    global firebase_app, db

    if firebase_admin._apps:
        firebase_app = firebase_admin.get_app()
        db = firestore.client()
        return firebase_app, db

    # Tìm file serviceAccountKey.json trong thư mục backend hoặc root
    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")
    
    if not os.path.exists(key_path):
        # Thử tìm ở thư mục cha nếu đang chạy từ app/
        parent_key = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "serviceAccountKey.json")
        if os.path.exists(parent_key):
            key_path = parent_key

    if os.path.exists(key_path):
        try:
            cred = credentials.Certificate(key_path)
            firebase_app = firebase_admin.initialize_app(cred)
            db = firestore.client()
            logger.info(f"✅ Kết nối Firebase Admin thành công với file: {key_path}")
        except Exception as e:
            logger.error(f"❌ Lỗi khi khởi tạo Firebase từ key {key_path}: {e}")
            raise e
    else:
        logger.warning(f"⚠️ Không tìm thấy file {key_path}. Firebase sẽ hoạt động ở chế độ fallback mock nếu cần.")
        try:
            # Thử khởi tạo mặc định (ví dụ khi chạy trong Google Cloud)
            firebase_app = firebase_admin.initialize_app()
            db = firestore.client()
        except Exception as e:
            logger.error(f"❌ Không thể khởi tạo Firebase: {e}")
            db = None

    return firebase_app, db

def get_firestore_db():
    """Dependency / Helper lấy Firestore database client"""
    global db
    if db is None:
        _, db = init_firebase()
    return db
