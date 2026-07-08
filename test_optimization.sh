#!/bin/bash

API_URL="http://localhost:8000"

echo "=== Simulador de Optimización de Deudas (Backend Actual) ==="

# Generamos un sufijo aleatorio para los emails por si los usuarios ya existen en la BD
RND=$RANDOM

# 1. Crear usuarios y extraer IDs y Tokens
echo -e "\n1. Creando usuarios..."
RES_ANA=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Ana\", \"email\": \"ana_${RND}@test.com\", \"password\": \"password123\"}")
ANA_ID=$(echo $RES_ANA | jq -r '.user.id')
ANA_TOKEN=$(echo $RES_ANA | jq -r '.token')

RES_BRUNO=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Bruno\", \"email\": \"bruno_${RND}@test.com\", \"password\": \"password123\"}")
BRUNO_ID=$(echo $RES_BRUNO | jq -r '.user.id')

RES_CARLOS=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Carlos\", \"email\": \"carlos_${RND}@test.com\", \"password\": \"password123\"}")
CARLOS_ID=$(echo $RES_CARLOS | jq -r '.user.id')

echo "Ana ID: $ANA_ID"
echo "Bruno ID: $BRUNO_ID"
echo "Carlos ID: $CARLOS_ID"

# 2. Crear un grupo (usando el token de Ana para la autenticación JWT)
echo -e "\n2. Creando grupo 'Test Optimización'..."
GROUP_ID=$(curl -s -X POST "$API_URL/groups" \
  -H "Authorization: Bearer $ANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Optimización"}' | jq -r '.id')
echo "Group ID: $GROUP_ID"

# 4. Registrar Gasto 1: Ana paga 30. Consumen Bruno (15) y Carlos (15)
# En la V2 usamos participants_ids y dividimos equitativamente (30 / 2 = 15 cada uno)
echo -e "\n4. Registrando Gasto 1 (Ana paga 30€)..."
curl -s -X POST "$API_URL/expenses" \
  -H "Authorization: Bearer $ANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"group_id\": \"$GROUP_ID\",
    \"description\": \"Gasto 1 - Cena\",
    \"amount\": 30.0,
    \"category\": \"General\",
    \"payer_id\": \"$ANA_ID\",
    \"date\": \"2023-10-01T12:00:00Z\",
    \"participants_ids\": [\"$BRUNO_ID\", \"$CARLOS_ID\"]
  }" > /dev/null

# 5. Registrar Gasto 2: Bruno paga 20. Consume Carlos (20)
echo -e "5. Registrando Gasto 2 (Bruno paga 20€)..."
curl -s -X POST "$API_URL/expenses" \
  -H "Authorization: Bearer $ANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"group_id\": \"$GROUP_ID\",
    \"description\": \"Gasto 2 - Entradas\",
    \"amount\": 20.0,
    \"category\": \"Ocio\",
    \"payer_id\": \"$BRUNO_ID\",
    \"date\": \"2023-10-02T12:00:00Z\",
    \"participants_ids\": [\"$CARLOS_ID\"]
  }" > /dev/null

# 6. Registrar Gasto 3: Carlos paga 10. Consume Ana (10)
echo -e "6. Registrando Gasto 3 (Carlos paga 10€)..."
curl -s -X POST "$API_URL/expenses" \
  -H "Authorization: Bearer $ANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"group_id\": \"$GROUP_ID\",
    \"description\": \"Gasto 3 - Taxis\",
    \"amount\": 10.0,
    \"category\": \"Transporte\",
    \"payer_id\": \"$CARLOS_ID\",
    \"date\": \"2023-10-03T12:00:00Z\",
    \"participants_ids\": [\"$ANA_ID\"]
  }" > /dev/null

# 7. Endpoint sin optimizar
echo -e "\n7. Llamada SIN optimización (optimize=false):"
curl -s -X GET "$API_URL/groups/$GROUP_ID/balances?optimize=false" \
  -H "Authorization: Bearer $ANA_TOKEN" | jq .

# 8. Endpoint optimizado
echo -e "\n8. Llamada CON optimización (optimize=true):"
curl -s -X GET "$API_URL/groups/$GROUP_ID/balances?optimize=true" \
  -H "Authorization: Bearer $ANA_TOKEN" | jq .
