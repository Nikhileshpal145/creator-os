from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core import security
from app.core.config import settings
from app.db.session import get_session
from app.models.user import User
from app.core.rate_limit import limiter

router = APIRouter()

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    business_name: str | None = None
    niche: str | None = None

class UserResponse(BaseModel):
    id: int | None = None
    email: str
    full_name: str
    business_name: str | None = None
    niche: str | None = None
    is_active: bool

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    statement = select(User).where(User.email == email)
    user = db.exec(statement).first()
    if user is None:
        raise credentials_exception
    return user

@router.post(
    "/register", 
    response_model=UserResponse,
    responses={
        400: {"description": "Email already exists"},
        429: {"description": "Too many registration attempts (Limit: 5/min)"}
    }
)
@limiter.limit("5/minute")
def register_user(user_in: UserCreate, request: Request, db: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_in.email)
    existing_user = db.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        business_name=user_in.business_name,
        niche=user_in.niche
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post(
    "/login", 
    response_model=Token,
    responses={
        401: {"description": "Incorrect email or password"},
        429: {"description": "Too many login attempts (Limit: 5/min)"}
    }
)
@limiter.limit("5/minute")
def login_for_access_token(request: Request, form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_session)):
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
