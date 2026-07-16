from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import persons, expenses, balances, auth, groups, categories, audit_logs
from backend.db.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mini-Tricount API",
    description="API para gestionar gastos y personas del grupo.",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "https://dev-frontend-service-684957121925.europe-southwest1.run.app"],
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

# Alias under /api to fix 404 for /api/login/ requests
app.include_router(auth.router, prefix="/api", tags=["api-auth"])
app.include_router(groups.router, prefix="/api/groups", tags=["api-groups"])
app.include_router(persons.router, prefix="/api/persons", tags=["api-persons"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["api-expenses"])
app.include_router(balances.router, prefix="/api/groups", tags=["api-balances"])
app.include_router(audit_logs.router, prefix="/api/groups", tags=["api-audit-logs"])
app.include_router(categories.router, prefix="/api", tags=["api-categories"])

@app.get("/")
def root():
    return {"message": "Bienvenido a la API de Mini-Tricount"}
