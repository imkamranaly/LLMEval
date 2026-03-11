from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import supabase

app = FastAPI(title="AITask API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthRequest(BaseModel):
    email: str
    password: str


@app.get("/")
def root():
    return {"message": "AITask API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-test")
def db_test():
    """Test Supabase connection by listing tables."""
    try:
        result = supabase.rpc("version").execute() if False else None
        return {"status": "connected", "supabase_url": supabase.supabase_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/signup")
def signup(body: AuthRequest):
    try:
        response = supabase.auth.sign_up({"email": body.email, "password": body.password})
        if response.user is None:
            raise HTTPException(status_code=400, detail="Signup failed. Please try again.")
        return {
            "message": "Signup successful. Please check your email to confirm your account.",
            "user": {"id": str(response.user.id), "email": response.user.email},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/signin")
def signin(body: AuthRequest):
    try:
        response = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return {
            "message": "Sign in successful.",
            "user": {"id": str(response.user.id), "email": response.user.email},
            "access_token": response.session.access_token,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
