from app.db.session import SessionLocal
from app.models.models import User
from app.core import security
import sys
import getpass

def change_password():
    print("--- Montange Password Change Utility ---")
    
    # Get username
    if len(sys.argv) > 1:
        username = sys.argv[1]
        print(f"Username: {username}")
    else:
        username = input("Enter username: ").strip()
        
    if not username:
        print("Username is required.")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            return

        # Get new password
        if len(sys.argv) > 2:
            new_password = sys.argv[2]
        else:
            new_password = getpass.getpass("Enter new password: ")
            confirm_password = getpass.getpass("Confirm new password: ")
            
            if new_password != confirm_password:
                print("Error: Passwords do not match.")
                return
                
        if not new_password:
            print("Error: Password cannot be empty.")
            return

        # Update password
        hashed_pwd = security.get_password_hash(new_password)
        user.hashed_password = hashed_pwd
        db.commit()
        
        print(f"Success: Password for '{username}' has been updated.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    change_password()
