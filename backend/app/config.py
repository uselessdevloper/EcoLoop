import os
from typing import Optional
from dotenv import load_dotenv

# Locate and load backend/.env file relative to this file
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

class Settings:
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "verivision_super_secret_key_change_me_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 Hours

    # OpenRouter API Integration
    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY", None)
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-nano-12b-v2-vl:free")
    FALLBACK_VISION_MODELS: list = ["nvidia/nemotron-nano-12b-v2-vl:free", "openrouter/free"]

    # NVIDIA NIM API Integration (Ultra Low Latency TensorRT-LLM Microservices)
    NVIDIA_NIM_API_KEY: Optional[str] = os.getenv("NVIDIA_NIM_API_KEY", None)
    NVIDIA_NIM_BASE_URL: str = os.getenv("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_VISION_MODEL: str = os.getenv("NVIDIA_VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")
    NVIDIA_TEXT_MODEL: str = os.getenv("NVIDIA_TEXT_MODEL", "meta/llama-3.1-8b-instruct")

    # Directory Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "data", "cases")
    GOLDEN_DIR: str = os.path.join(BASE_DIR, "data", "golden")
    REPORTS_DIR: str = os.path.join(BASE_DIR, "data", "reports")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'verivision.db')}")

    # Vision Thresholds
    SSIM_THRESHOLD: float = 0.80
    BLUR_THRESHOLD: float = 100.0  # Laplacian variance threshold
    BRIGHTNESS_MIN: int = 40
    BRIGHTNESS_MAX: int = 220
    KEYPOINT_MATCH_MIN: float = 0.60  # Percentage of matched features

settings = Settings()

# Ensure required directories exist
for path in [settings.UPLOAD_DIR, settings.GOLDEN_DIR, settings.REPORTS_DIR]:
    os.makedirs(path, exist_ok=True)
