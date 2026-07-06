from fastapi import FastAPI
from backend.api.routes import persons, expenses, balances, auth, groups

app = FastAPI(
    title="Mini-Tricount API",
    description="API para gestionar gastos y personas del grupo.",
    version="1.0.0"
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(persons.router, prefix="/persons", tags=["persons"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(balances.router, prefix="/groups", tags=["balances"])

@app.get("/")
def root():
    return {"message": "Bienvenido a la API de Mini-Tricount"}
