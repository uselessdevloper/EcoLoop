from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app import models
from routers import partner_router, pickup_router, twilio_router
from services import partner_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup table creation, initial data seeding, and cleanup on shutdown.
    """
    # 1. Automatic table creation
    Base.metadata.create_all(bind=engine)
    print("[DB] Database tables automatically created/verified.")

    # 2. Automatic seeding of initial partners (Rajesh, Amit, Suresh)
    db = SessionLocal()
    try:
        seeded = partner_service.seed_partners_if_empty(db)
        print(f"[DB] Initialized with {len(seeded)} partners (Rajesh, Amit, Suresh).")
    finally:
        db.close()

    yield
    print("[SYSTEM] Application shutdown complete.")


# Instantiate FastAPI app with Swagger UI documentation parameters
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="""
🌱 **EcoLoop API** - Smart E-Waste Recycling & Partner Dispatch Platform.

### Features
* **Partner Management**: Track recycling partners (Rajesh, Amit, Suresh), locations, ratings, status, and preferred modes.
* **Pickup Logistics**: Consumer submission, auto status pending, dispatch, and tracking.
* **Geo Matching**: Haversine distance matching of nearest available partners.
* **Twilio Voice Integration**: Interactive TwiML voice prompts and webhook callbacks.
""",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(partner_router.router, prefix="/api/v1")
app.include_router(partner_router.router)

app.include_router(pickup_router.router, prefix="/api/v1")
app.include_router(pickup_router.router)

app.include_router(twilio_router.router, prefix="/api/v1")
app.include_router(twilio_router.router)


@app.get("/", include_in_schema=False)
def root():
    """Redirect root path to interactive Swagger documentation."""
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["Health"], summary="Health check endpoint")
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }
