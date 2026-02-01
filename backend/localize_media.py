import os
import sqlite3
from app.core.config import BASE_URL

def localize():
    db_path = os.path.join(os.path.dirname(__file__), "montage.db")
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    default_avatar = f"{BASE_URL}/static/defaults/default_avatar.png"
    
    print(f"Localizing profile pictures to: {default_avatar}")

    # 1. Update Users with B2 profile pictures
    cursor.execute(
        "UPDATE users SET profile_pic = ? WHERE profile_pic LIKE '%backblazeb2.com%';",
        (default_avatar,)
    )
    print(f"Updated {cursor.rowcount} user profiles.")

    # 2. Update Videos with B2 resolution URLs (if any exist)
    # Even if we didn't see any in our check, it's safe to run.
    resolutions = ["video_url", "url_480p", "url_720p", "url_1080p", "url_2k", "url_4k"]
    for res in resolutions:
        cursor.execute(
            f"UPDATE videos SET {res} = '' WHERE {res} LIKE '%backblazeb2.com%';"
        )
        if cursor.rowcount > 0:
            print(f"Cleared {cursor.rowcount} B2 URLs in videos.{res}")

    conn.commit()
    conn.close()
    print("Localization complete.")

if __name__ == "__main__":
    localize()
