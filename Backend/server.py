import sys
import os

# --- CRITICAL FIX: Add current folder to Python path ---
# This ensures 'schemas.py' and 'crud.py' can be found by files inside 'Mains/'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# -------------------------------------------------------

from fastapi import FastAPI
from database import engine, Base
import crud

# Create Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="YANTRA 2026")

# Import Routers (Must happen AFTER sys.path fix)
from Mains import Citizen_main, Attacker_main, Authority_main, Auditor_main

app.include_router(Citizen_main.router)
app.include_router(Attacker_main.router)
app.include_router(Authority_main.router)
app.include_router(Auditor_main.router)

@app.get("/global_health")
def health_check():
    from database import SessionLocal
    db = SessionLocal()
    h = crud.get_health(db)
    db.close()
    return {"health": h}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)