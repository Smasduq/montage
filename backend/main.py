from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.db.base import Base
from app.db.session import engine
from app.core import dependencies
from app.schemas import schemas

# Create tables
Base.metadata.create_all(bind=engine)

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Montage Video Platform")

# Mount static files
static_path = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_path, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)



@app.post("/token", tags=["auth"])
async def token_proxy(db=Depends(dependencies.get_db), form_data=Depends()):
    # This is handled by a router but we can keep a proxy or redirection if needed
    # Better to just use the router included above.
    pass
