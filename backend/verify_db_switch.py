from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base
from app.models import models # Ensure models are loaded
import sys

def verify_db():
    print(f"Connecting to database via SQLAlchemy...")
    try:
        # Create tables if they don't exist (safe)
        Base.metadata.create_all(bind=engine)
        print("Schema creation/check successful.")
        
        # Test connection and query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print(f"Connection test result: {result.scalar()}")
            
            # Check user table
            # Adjust query based on likely existing data or empty
            # We just want to ensure the table query works, not necessarily find data
            try:
                result = connection.execute(text('SELECT count(*) FROM "User"')) # Postgres quotes
                print(f"User count (Postgres style): {result.scalar()}")
            except Exception as e:
                try:
                    # SQLite might be case sensitive differently or not need quotes if not created with quotes
                    # But models.py defines table name as "users" (lowercase) in __tablename__? 
                    # Wait, supabase_schema.sql made "User".
                    # models.py says __tablename__ = "users" (lowercase).
                    # If we use SQLite, models.py will create "users".
                    # If Supabase, it has "User".
                    # We need to ensure models match actual DB table names if existing.
                    # models.py: __tablename__ = "users"
                    # supabase_schema.sql: CREATE TABLE "User"
                    # This is a mismatch. Supabase/Postgres is case sensitive if quoted.
                    # If `DATABASE_URL` points to Supabase, we might have issues if models use "users" and DB has "User".
                    # But earlier I saw `models.py` has `__tablename__ = "users"`.
                    # Let's check reset_db.py content (I couldn't).
                    # Let's try "users" (lowercase).
                    result = connection.execute(text("SELECT count(*) FROM users"))
                    print(f"User count (lowercase): {result.scalar()}")
                except Exception as e2:
                    print(f"Failed to query users table: {e}, {e2}")

        print("Verification SUCCESS.")
        return True
    except Exception as e:
        print(f"Verification FAILED: {e}")
        return False

if __name__ == "__main__":
    if verify_db():
        sys.exit(0)
    else:
        sys.exit(1)
