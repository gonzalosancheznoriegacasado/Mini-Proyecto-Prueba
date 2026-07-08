import urllib.request
import urllib.error
import json
import random

API_URL = "http://localhost:8000"

def make_request(method, endpoint, data=None, token=None):
    url = f"{API_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            if res_body:
                return json.loads(res_body)
            return None
    except urllib.error.HTTPError as e:
        print(f"Error HTTP {e.code}: {e.read().decode('utf-8')}")
        return None

rnd = random.randint(1000, 9999)

print("=== Simulador de Optimización de Deudas (Python) ===")

print("\n1. Creando usuarios...")
ana = make_request("POST", "/auth/register", {"name": "Ana", "email": f"ana_{rnd}@test.com", "password": "password123"})
bruno = make_request("POST", "/auth/register", {"name": "Bruno", "email": f"bruno_{rnd}@test.com", "password": "password123"})
carlos = make_request("POST", "/auth/register", {"name": "Carlos", "email": f"carlos_{rnd}@test.com", "password": "password123"})

if not ana or not bruno or not carlos:
    print("Error al crear usuarios. Revisa que el backend esté corriendo en el puerto 8000.")
    exit(1)

ana_id = ana["user"]["id"]
ana_token = ana["token"]
bruno_id = bruno["user"]["id"]
carlos_id = carlos["user"]["id"]

print(f"Ana ID: {ana_id}")
print(f"Bruno ID: {bruno_id}")
print(f"Carlos ID: {carlos_id}")

print("\n2. Creando grupo 'Test Optimización'...")
group = make_request("POST", "/groups/", {"name": "Test Optimización"}, ana_token)
group_id = group["id"]
print(f"Group ID: {group_id}")

print("\n4. Registrando Gasto 1 (Ana paga 30€, consumen Bruno y Carlos)...")
make_request("POST", "/expenses/", {
    "group_id": group_id,
    "description": "Gasto 1 - Cena",
    "amount": 30.0,
    "category": "General",
    "payer_id": ana_id,
    "date": "2023-10-01T12:00:00Z",
    "participants_ids": [bruno_id, carlos_id]
}, ana_token)

print("5. Registrando Gasto 2 (Bruno paga 20€, consume Carlos)...")
make_request("POST", "/expenses/", {
    "group_id": group_id,
    "description": "Gasto 2 - Entradas",
    "amount": 20.0,
    "category": "Ocio",
    "payer_id": bruno_id,
    "date": "2023-10-02T12:00:00Z",
    "participants_ids": [carlos_id]
}, ana_token)

print("6. Registrando Gasto 3 (Carlos paga 10€, consume Ana)...")
make_request("POST", "/expenses/", {
    "group_id": group_id,
    "description": "Gasto 3 - Taxis",
    "amount": 10.0,
    "category": "Transporte",
    "payer_id": carlos_id,
    "date": "2023-10-03T12:00:00Z",
    "participants_ids": [ana_id]
}, ana_token)

print("\n7. Llamada SIN optimización (optimize=false):")
res_no_opt = make_request("GET", f"/groups/{group_id}/balances?optimize=false", token=ana_token)
print(json.dumps(res_no_opt, indent=2, ensure_ascii=False))

print("\n8. Llamada CON optimización (optimize=true):")
res_opt = make_request("GET", f"/groups/{group_id}/balances?optimize=true", token=ana_token)
print(json.dumps(res_opt, indent=2, ensure_ascii=False))
