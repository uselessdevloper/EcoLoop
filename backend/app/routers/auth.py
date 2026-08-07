from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging
from app.config import settings

from app.database import get_db
from app import models, schemas, utils

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Register request received for email: {user_in.email}")
    # Check if email is already taken
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        logger.warning(f"Registration failed: Email {user_in.email} already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Hash password and create user
    hashed_password = utils.get_password_hash(user_in.password)
    db_user = models.User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info(f"User profile registered successfully for email: {db_user.email}")
    return db_user

@router.post("/login", response_model=schemas.Token)
@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    logger.info(f"Login attempt for user: {form_data.username}")
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Authentication failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = utils.create_access_token(data={"sub": user.email, "role": user.role})
    logger.info(f"Access token successfully generated for user: {user.email}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(utils.get_current_user)):
    return current_user
