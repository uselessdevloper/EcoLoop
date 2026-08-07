from jose import JWTError, jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models, schemas

# OAuth2 Scheme for reading Bearer Token from header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Dependency to fetch the currently authenticated user
def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    # 1. Try to read from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
    # 2. Try to read from query parameter (for direct file downloads)
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

# Helper to check roles (admin-only actions)
def require_role(allowed_roles: list):
    def dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden for role: {current_user.role}",
            )
        return current_user
    return dependency


def load_image_robust(file_path_or_bytes):
    """
    Safely reads an image using OpenCV, with a PIL fallback for formats 
    like AVIF/WEBP/HEIC that OpenCV might fail to decode natively.
    Returns BGR numpy array or None.
    """
    import cv2
    import numpy as np
    try:
        if isinstance(file_path_or_bytes, str):
            img = cv2.imread(file_path_or_bytes)
        else:
            img = cv2.imdecode(np.frombuffer(file_path_or_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is not None:
            return img
    except Exception:
        pass

    try:
        from PIL import Image, ImageOps
        pil_img = Image.open(file_path_or_bytes)
        pil_img = ImageOps.exif_transpose(pil_img)
        pil_img = pil_img.convert('RGB')
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception:
        return None




