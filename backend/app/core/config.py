import os
from dotenv import load_dotenv

# Load .env file from the backend directory
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_ME")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "2880"))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
RUST_SERVICE_URL = os.getenv("RUST_SERVICE_URL", "http://127.0.0.1:8081") # default port changed to matched rust service
S3_BUCKET_NAME = os.getenv("B2_BUCKET_NAME") or os.getenv("S3_BUCKET_NAME")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_ENDPOINT_URL = os.getenv("B2_ENDPOINT_URL") or os.getenv("S3_ENDPOINT_URL")
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static")

# Supabase SDK Config - Kept for Auth/Legacy
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Database Configuration
# Default to SQLite for local development if not set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./montage.db")

# Quota Limits
FLASH_QUOTA_LIMIT = 50
HOME_QUOTA_LIMIT = 20
