from fastapi import FastAPI
from backend.api.routes import persons, expenses

app = FastAPI(
    title="Mini-Tricount API",
    description="API para gestionar gastos y personas del grupo.",
    version="1.0.0"
)

# Conectar el router de personas al archivo principal
app.include_router(persons.router, prefix="/persons", tags=["persons"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])

@app.get("/")
def root():
    return {"message": "Bienvenido a la API de Mini-Tricount"}
