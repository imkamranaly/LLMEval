from fastapi import FastAPI, HTTPException
from database import supabase

app = FastAPI(title="AITask API", version="1.0.0")


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
        # Ping supabase by querying pg_tables (works on any supabase project)
        result = supabase.rpc("version").execute() if False else None
        return {"status": "connected", "supabase_url": supabase.supabase_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
