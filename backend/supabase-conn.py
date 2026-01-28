import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load variables from .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Initialize the Supabase client (SYNC client)
supabase: Client = create_client(url, key)

# Sync function (DO NOT make this async)
def get_montages_sync():
    response = supabase.table("montages").select("*").execute()
    return response.data

# Async wrapper (ASGI-safe)
async def get_montages():
    return await asyncio.to_thread(get_montages_sync)

# For testing the file directly
if __name__ == "__main__":
    data = get_montages_sync()
    print(data)
