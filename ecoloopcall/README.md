# EcoLoop Backend API

A FastAPI backend foundation for **EcoLoop**, powered by SQLite, SQLAlchemy, Pydantic, and python-dotenv.

## Project Structure

```text
ecoloopcall/
│
├── app/
│   ├── __init__.py       # Package initialization
│   ├── config.py         # Environment variables & configuration loading
│   ├── database.py       # SQLAlchemy engine, session maker & Base
│   ├── models.py         # SQLAlchemy database models (Partner, Pickup)
│   ├── schemas.py        # Pydantic validation schemas
│   └── main.py           # FastAPI application entrypoint & table creation
│
├── routers/
│   ├── __init__.py       # Routers package
│   ├── partner_router.py # API endpoints for Partner management
│   └── pickup_router.py  # API endpoints for Pickup requests
│
├── services/
│   ├── __init__.py       # Services package
│   ├── partner_service.py# CRUD business logic for Partners
│   └── pickup_service.py # CRUD business logic for Pickups
│
├── .env                  # Environment configuration
├── .env.example          # Template environment file
├── requirements.txt      # Python dependencies
└── README.md             # Project documentation
```

## Features Implemented

1. **Database Connection**: SQLite setup using SQLAlchemy (`sqlite:///./ecoloop.db`).
2. **SQLAlchemy Setup**: Engine, `SessionLocal`, `Base`, and `get_db()` dependency injection.
3. **Automatic Table Creation**: `Base.metadata.create_all(bind=engine)` runs automatically on app startup inside FastAPI lifespan context manager.
4. **Environment Variable Loading**: Loaded cleanly via `python-dotenv` in `app/config.py`.
5. **FastAPI Startup**: Initialized in `app/main.py` with CORS middleware, lifespan events, and router aggregation.
6. **Swagger Documentation**: Available at `/docs` (and ReDoc at `/redoc`) with tags, summaries, and schemas.
7. **Database Models**:
   - **Partner**: `id`, `uid`, `name`, `phone`, `latitude`, `longitude`, `status`, `rating`, `acceptance_rate`, `preferred_mode`, `created_at`
   - **Pickup**: `id`, `consumer_name`, `device`, `latitude`, `longitude`, `estimated_price`, `status`, `assigned_partner`, `created_at`
8. **Pydantic Schemas**: Comprehensive validation models (`PartnerBase`, `PartnerCreate`, `PartnerUpdate`, `PartnerResponse`, `PickupBase`, `PickupCreate`, `PickupUpdate`, `PickupResponse`).

---

## Getting Started

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Development Server

Execute from the project root directory:

```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Access Swagger UI Documentation

Open your browser and navigate to:
- **Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
