from fastapi import FastAPI
from app.api.auth import router as auth_router

app = FastAPI(
    title="AI LMS Backend"
)

app.include_router(auth_router)

@app.get("/")
async def root():
    return {
        "message": "Backend Running Successfully"
    }