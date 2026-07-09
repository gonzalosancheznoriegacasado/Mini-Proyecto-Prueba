# Especificaciones del Frontend: Mini-Tricount - Versión 2

## 1. Visión General (V2)

Mini-Tricount Frontend V2 evoluciona la interfaz de la V1 (grupo único, datos locales) hacia una aplicación multi-grupo con autenticación JWT. El usuario inicia sesión, gestiona varios grupos (viajes, pisos, eventos) y, dentro de cada grupo, registra gastos con categoría y participantes concretos — no todo el grupo por defecto.

La UI mantiene el diseño dark/glassmorphism de la V1, pero reorganiza la navegación en torno al **grupo activo** y consume los endpoints protegidos del backend V2.

### Diferencias respecto a la V1 (estado actual del repo)

| Aspecto | V1 (implementado) | V2 (objetivo) |
|---------|-------------------|---------------|
| Usuarios | `Person` local sin email | `User` autenticado con JWT |
| Grupos | Un único grupo implícito | Selector de múltiples grupos |
| Reparto | Igualitario entre todos | Solo entre `participants_ids` del gasto |
| Categorías | No existen | Selector con categorías predefinidas |
| Balances | Calculados en cliente | Obtenidos de `GET /groups/{id}/balances` |
| Estadísticas | No existen | Panel con `GET /groups/{id}/statistics` |
| Gastos | Lista completa | Paginación y filtros |

---

## 2. Stack Tecnológico

- **Framework:** React 19 + TypeScript + Vite.
- **Estilos:** Tailwind CSS 4 (tema oscuro, utilidades `glass`, gradientes indigo/purple).
- **Iconos:** Lucide React.
- **HTTP:** Axios con interceptor JWT (`Authorization: Bearer <token>`).
- **Estado global:** React Context API (`AuthContext` + `GroupContext` + `AppContext`), evolucionando el `AppContext` actual.
- **Persistencia local:** `localStorage` para token JWT y grupo activo seleccionado.
- **Variables de entorno:** `VITE_API_URL` (por defecto `http://localhost:8000`).

---

## 3. Tipos TypeScript (Contrato con el Backend)

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  payer_id: string;
  category: string;
  date: string;
  participants_ids: string[];
  payer?: User; // Incluido en respuestas enriquecidas del backend
}

interface Balance {
  group_id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;
}

interface CategoryStatistic {
  category: string;
  total_amount: number;
}

interface PaginatedExpenses {
  data: Expense[];
  total: number;
  limit: number;
  offset: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
```

### Categorías predefinidas (constante en frontend)

```typescript
const EXPENSE_CATEGORIES = [
  'Comida',
  'Alojamiento',
  'Transporte',
  'Ocio',
  'Compras',
  'Otros',
] as const;
```

---

## 4. Arquitectura de la UI

### 4.1. Estructura de carpetas propuesta

```
frontend/src/
├── api/
│   └── axios.ts              # Cliente Axios + interceptor JWT
├── context/
│   ├── AuthContext.tsx       # Sesión, login, logout, register
│   ├── GroupContext.tsx      # Grupo activo, listado, CRUD
│   └── AppContext.tsx        # Gastos, balances, stats del grupo activo
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── GroupSelector.tsx
│   │   └── ProtectedRoute.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── expenses/
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseList.tsx
│   │   └── ExpenseFilters.tsx
│   ├── balances/
│   │   ├── BalanceList.tsx
│   │   └── IndividualBalances.tsx
│   ├── groups/
│   │   ├── GroupList.tsx
│   │   └── CreateGroupModal.tsx
│   └── statistics/
│       └── CategoryChart.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx     # Vista principal post-login
│   └── GroupPage.tsx         # Detalle del grupo activo (tabs)
├── types/
│   └── index.ts
└── App.tsx                   # Router principal
```

### 4.2. Rutas

| Ruta | Componente | Acceso |
|------|------------|--------|
| `/login` | `LoginPage` | Público |
| `/register` | `RegisterPage` | Público |
| `/` | Redirección a `/groups` o `/login` | — |
| `/groups` | `GroupListPage` | Autenticado |
| `/groups/:groupId` | `GroupPage` (tabs) | Autenticado |

### 4.3. Pestañas del grupo activo (`GroupPage`)

Reutiliza el patrón de tabs de la V1, ampliado:

1. **Balances y Deudas** — transferencias calculadas por el backend.
2. **Gastos** — formulario + listado paginado con filtros.
3. **Estadísticas** — gráfico/tarjetas por categoría (nuevo en V2).
4. **Miembros** — integrantes del grupo (solo lectura desde API; la gestión de miembros se hará vía invitaciones en V3).

### 4.4. Componentes clave nuevos

#### `GroupSelector`
Dropdown o sidebar lateral para cambiar el grupo activo. Al cambiar, recarga gastos, balances y estadísticas del nuevo `group_id`.

#### `ExpenseForm` (actualizado)
Campos adicionales respecto a V1:
- **Categoría:** `<select>` con `EXPENSE_CATEGORIES`.
- **Participantes:** checkboxes multi-select de miembros del grupo (mínimo 1). Por defecto, todos marcados.
- **Grupo:** implícito desde `GroupContext.activeGroup.id`.

#### `ExpenseFilters`
Controles sobre la lista paginada:
- Filtro por categoría.
- Filtro por pagador.
- Paginación: botones Anterior/Siguiente + indicador `offset/limit/total`.

#### `CategoryChart`
Visualización simple (barras horizontales o tarjetas con porcentaje) alimentada por `CategoryStatistic[]`.

---

## 5. Gestión de Estado

### 5.1. `AuthContext`

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

- Al hacer login/register: guardar `token` en `localStorage` (`tricount_token`) y `user` en estado.
- Al iniciar la app: restaurar token y validar con una petición autenticada (p. ej. `GET /groups`).
- Logout: limpiar token, user y redirigir a `/login`.

### 5.2. `GroupContext`

```typescript
interface GroupContextType {
  groups: Group[];
  activeGroup: Group | null;
  loading: boolean;
  setActiveGroup: (group: Group) => void;
  createGroup: (name: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
}
```

- Persistir `activeGroup.id` en `localStorage` (`tricount_active_group`).
- Tras login, cargar `GET /groups` y seleccionar el grupo guardado o el primero disponible.

### 5.3. `AppContext` (refactorizado)

Eliminar el modo Local/API de la V1 en producción V2 (opcional mantenerlo solo para desarrollo/demo).

Estado por grupo activo:
```typescript
interface AppContextType {
  expenses: Expense[];
  balances: Balance[];
  statistics: CategoryStatistic[];
  pagination: { total: number; limit: number; offset: number };
  loading: boolean;
  error: string | null;
  filters: ExpenseFilters;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  addExpense: (expense: ExpenseCreatePayload) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
}
```

**Importante:** Los balances ya no se calculan en el cliente. Se obtienen de la API.

---

## 6. Integración con la API REST

### 6.1. Cliente Axios (`api/axios.ts`)

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tricount_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tricount_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 6.2. Endpoints consumidos

| Acción UI | Método | Endpoint |
|-----------|--------|----------|
| Login | `POST` | `/auth/login` |
| Registro | `POST` | `/auth/register` |
| Listar grupos | `GET` | `/groups` |
| Crear grupo | `POST` | `/groups` |
| Listar gastos | `GET` | `/expenses?group_id=&limit=&offset=&category=&payer_id=` |
| Crear gasto | `POST` | `/expenses` |
| Eliminar gasto | `DELETE` | `/expenses/{id}` |
| Balances del grupo | `GET` | `/groups/{group_id}/balances` |
| Estadísticas | `GET` | `/groups/{group_id}/statistics` |

### 6.3. Payload de creación de gasto

```json
{
  "group_id": "uuid-del-grupo",
  "description": "Cena pizzería",
  "amount": 45.50,
  "payer_id": "uuid-del-pagador",
  "category": "Comida",
  "date": "2026-07-09T12:00:00",
  "participants_ids": ["uuid-user-1", "uuid-user-2"]
}
```

---

## 7. Flujos de Usuario

### 7.1. Onboarding
1. Usuario accede a `/register`, crea cuenta.
2. Backend devuelve JWT → se guarda y redirige a `/groups`.
3. Usuario crea su primer grupo ("Viaje a Berlín").
4. Entra al grupo y registra el primer gasto.

### 7.2. Cambio de grupo
1. Usuario selecciona otro grupo en `GroupSelector`.
2. Se actualizan tabs de gastos, balances y estadísticas.
3. Filtros de gastos se reinician.

### 7.3. Registro de gasto con participantes parciales
1. Usuario abre formulario en tab Gastos.
2. Selecciona pagador, categoría y desmarca participantes que no intervinieron.
3. Frontend valida: al menos 1 participante, importe > 0.
4. `POST /expenses` → refresco de lista, balances y estadísticas.

### 7.4. Consulta de deudas
1. Tab Balances llama a `GET /groups/{id}/balances`.
2. Muestra tarjetas "X debe Y € a Z" (mismo patrón visual que V1).
3. Panel lateral con saldo neto individual (calculado en frontend a partir de gastos o endpoint futuro).

---

## 8. Diseño y UX

- **Conservar** el sistema visual V1: fondo `#0b0f19`, tarjetas `glass`, acentos indigo/purple/emerald.
- **Header:** logo + nombre de usuario + botón logout + `GroupSelector`.
- **Estados vacíos:** mensajes contextuales con iconos Lucide (sin grupo, sin gastos, cuentas saldadas).
- **Loading:** barra animada bajo el header + spinners en botones de acción.
- **Errores:** banner rojo reutilizable (como el actual de modo API).
- **Responsive:** grid 1 columna en móvil, 3 columnas en desktop para formulario + listado.

---

## 9. Validaciones en Cliente

| Campo | Regla |
|-------|-------|
| Email (login/register) | Formato email válido |
| Contraseña (register) | Mínimo 6 caracteres |
| Nombre de grupo | No vacío, máx. 80 caracteres |
| Descripción gasto | No vacía |
| Importe | Número > 0, máx. 2 decimales |
| Participantes | Array no vacío |
| Pagador | Debe ser miembro del grupo activo |

---

## 10. Notas de Implementación

1. **Eliminar cálculo local de balances** del `useEffect` actual en `AppContext.tsx`; delegar al backend.
2. **Migración desde V1:** el modo Local puede conservarse bajo flag de desarrollo, pero la V2 de producción asume API + auth obligatoria.
3. **Miembros del grupo:** en V2 el backend no expone aún un `GET /groups/{id}/members`; obtener participantes disponibles desde los gastos existentes o añadir endpoint. Alternativa temporal: usar `participants_ids` acumulados + el usuario autenticado.
4. **Fechas:** enviar ISO 8601 al backend (`date` como `datetime`).
5. **Paginación:** `limit` por defecto 10; mostrar controles solo si `total > limit`.
