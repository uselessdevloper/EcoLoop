import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "EcoLoop API")
    PROJECT_VERSION: str = os.getenv("PROJECT_VERSION", "1.0.0")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ecoloop.db")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t", "yes")

    # Twilio Configuration
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    TWILIO_WEBHOOK_BASE_URL: str = os.getenv("TWILIO_WEBHOOK_BASE_URL", "http://localhost:8000")
    TWILIO_STUDIO_FLOW_SID: str = os.getenv("TWILIO_STUDIO_FLOW_SID", "FWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")


settings = Settings()
