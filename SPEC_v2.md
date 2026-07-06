# Especificaciones del Proyecto: Mini-Tricount (Full-Stack) - Versión 2

## 1. Visión General (V2)
Mini-Tricount V2 es una aplicación web multi-grupo que permite a los usuarios registrados gestionar gastos compartidos. A diferencia de la V1, esta versión soporta múltiples grupos (viajes, pisos, eventos), autenticación segura, división de gastos entre participantes específicos (no todo el grupo por defecto), categorización de gastos y métricas de consumo. 

## 2. Stack Tecnológico
- **Frontend:** React (Vite) + Tailwind CSS.
- **Gestión de Estado:** React Context API (o Redux/Zustand para manejar estado de sesión JWT y grupos).
- **Backend:** Python (FastAPI/Flask/Django).
- **Seguridad:** JWT (JSON Web Tokens) para autenticación y bcrypt (o similar) para cifrado de contraseñas.
- **Base de Datos:** PostgreSQL (base de datos relacional).
- **Comunicación HTTP:** Axios (enviando el token JWT en las cabeceras).

---

## 3. Modelo de Datos (Entidades y Base de Datos)
La base de datos en PostgreSQL y las interfaces del frontend compartirán la siguiente estructura:

```typescript
// Representa a un usuario registrado en el sistema (Tabla: users/persons)
interface User {
  id: string;        // UUID 
  name: string;
  email: string;     // NUEVO V2: Necesario para el login
  // En BD existirá password_hash, pero no se devuelve al frontend
  created_at: string;
}

// Representa un grupo de gastos (Tabla: groups) - NUEVO V2
interface Group {
  id: string;
  name: string;      // Ej: "Viaje a Berlín", "Piso Compartido"
  created_by: string;// Foreign Key -> users.id
  created_at: string;
}

// Representa un gasto (Tabla: expenses) - ACTUALIZADO V2
interface Expense {
  id: string;
  group_id: string;    // NUEVO V2: Foreign Key -> groups.id
  description: string; 
  amount: number;      
  payer_id: string;    // Foreign Key -> users.id (quien pagó)
  category: string;    // NUEVO V2: 'Comida', 'Alojamiento', 'Transporte', etc.
  date: string;        
  // NUEVO V2: Lista de IDs de los usuarios implicados en este gasto específico
  // (En base de datos esto se gestiona con una tabla intermedia expense_participants)
  participants_ids: string[]; 
}

// Representa el balance final calculado - ACTUALIZADO V2
interface Balance {
  group_id: string;    // NUEVO V2: El balance pertenece a un grupo
  debtor_id: string;   // ID de quien debe pagar
  creditor_id: string; // ID de a quién le deben
  amount: number;      // Cuánto debe
}

// Representa las estadísticas de gastos - NUEVO V2
interface CategoryStatistic {
  category: string;
  total_amount: number;
}
```

---

## 4. Contrato de la API REST (Endpoints)

> **⚠️ IMPORTANTE - PROTECCIÓN DE RUTAS:** > Todos los endpoints (excepto `/auth/login` y el registro si lo hay) requieren que el cliente envíe un header de autorización:
> `Authorization: Bearer <JWT_TOKEN>`

### 4.1. Autenticación
* **`POST /auth/login`**
    * **Body:** `{ "email": "user@email.com", "password": "mypassword" }`
    * **Response (200 OK):** `{ "token": "eyJhbGciOiJIUzI1...", "user": { "id": "...", "name": "..." } }`

### 4.2. Grupos
* **`POST /groups`** (Crear un grupo nuevo)
    * **Body:** `{ "name": "Viaje a Berlín" }`
    * **Response (201 Created):** Objeto `Group`.
* **`GET /groups`** (Listar grupos a los que pertenece el usuario autenticado)
    * **Response (200 OK):** `Group[]` (Array de grupos).

### 4.3. Gastos
* **`POST /expenses`** (Crear un gasto)
    * **Body:** ```json
        {
          "group_id": "uuid-del-grupo",
          "description": "Cena pizzería",
          "amount": 45.50,
          "payer_id": "uuid-del-pagador",
          "category": "Comida",
          "participants_ids": ["uuid-user-1", "uuid-user-2"] 
        }
        ```
    * **Response (201 Created):** Objeto `Expense`.

* **`GET /expenses`** (Listar gastos - **Con Paginación y Filtros**)
    * **Query Params (Opcionales):**
        * `group_id` (Recomendado para filtrar por grupo)
        * `limit` (Numérico, ej: 10)
        * `offset` (Numérico, ej: 0)
        * `payer_id` (UUID)
        * `category` (String)
    * **Ejemplo de uso:** `GET /expenses?group_id=123&limit=10&offset=20&category=Comida`
    * **Response (200 OK):**
        ```json
        {
          "data": [ Expense, Expense, ... ],
          "total": 54,
          "limit": 10,
          "offset": 20
        }
        ```

### 4.4. Cálculos y Estadísticas
* **`GET /groups/{group_id}/balances`** (Cálculo de deudas de un grupo específico)
    * *Nota Backend:* El cálculo debe dividir el importe de cada gasto **solo** entre los `participants_ids` del mismo.
    * **Response (200 OK):** `Balance[]` (Array de quién debe a quién en ese grupo).

* **`GET /groups/{group_id}/statistics`** (Suma de gastos por categoría)
    * **Response (200 OK):** `CategoryStatistic[]` 
    * *Ejemplo:* `[{"category": "Comida", "total_amount": 120.50}, {"category": "Transporte", "total_amount": 45.00}]`

---

### 💡 Consejos para la implementación (Notas para el equipo)
1.  **Tablas intermedias (BD):** Necesitaremos crear `group_members` (para saber qué usuarios están en qué grupo) y `expense_participants` (para relacionar un ticket con las personas que comparten ese gasto en concreto).
2.  **Lógica del algoritmo de saldos:** El algoritmo V1 dividía el `amount` / `total_personas_grupo`. El nuevo algoritmo V2 debe iterar gasto por gasto y dividir `amount` / `length(participants_ids)`.