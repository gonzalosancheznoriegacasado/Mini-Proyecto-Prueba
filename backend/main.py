from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import persons, expenses, balances, auth, groups, categories, audit_logs
from backend.db.database import engine, Base

app = FastAPI(
    title="Mini-Tricount API",
    description="API para gestionar gastos y personas del grupo.",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todos los orígenes, cámbialo a ["http://localhost:5173"] si quieres más seguridad
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(persons.router, prefix="/persons", tags=["persons"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(balances.router, prefix="/groups", tags=["balances"])
app.include_router(audit_logs.router, prefix="/groups", tags=["audit-logs"])
app.include_router(categories.router, tags=["categories"])

@app.get("/")
def root():
    return {"message": "Bienvenido a la API de Mini-Tricount"}
