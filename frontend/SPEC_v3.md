# Especificaciones del Frontend: Mini-Tricount - Versión 3

## 1. Visión General (V3)

Mini-Tricount Frontend V3 es la evolución avanzada sobre la V2. Incorpora las capacidades empresariales que el backend V3 ya expone (o planifica): reparto de gastos no equitativo, optimización de deudas, control de acceso por roles (RBAC), invitaciones con enlace/QR, categorías personalizadas por grupo y registro de auditoría.

La interfaz debe reflejar los permisos del usuario en cada grupo: un `VIEWER` no ve botones de edición, un `ADMIN` puede eliminar grupos y gestionar miembros, etc.

### Novedades respecto a la V2

| Característica | V2 | V3 |
|----------------|----|----|
| Reparto de gastos | Igualitario entre participantes | `EQUAL`, `EXACT`, `PERCENTAGE`, `SHARES` |
| Balances | Lista simple | Toggle "Optimizar deudas" (`?optimize=true`) |
| Miembros | Solo lectura | Invitaciones por token + QR |
| Roles | Todos iguales | `ADMIN` / `MEMBER` (RBAC en UI) |
| Categorías | Lista fija global | Personalizables por grupo con color |
| Trazabilidad | No | Panel de Audit Log |
| Eliminar gasto | Cualquier miembro | Solo pagador o ADMIN |

> **Nota de alineación con backend:** El backend actual implementa roles `ADMIN` y `MEMBER`. La spec global menciona `EDITOR` y `VIEWER`; el frontend V3 debe mapear `MEMBER` como rol con permisos de edición limitados (crear gastos, no administrar grupo).

---

## 2. Stack Tecnológico

Todo lo de V2, más:

- **Routing:** React Router v6+ (rutas anidadas por grupo, ruta pública `/join/:token`).
- **QR:** Librería `qrcode.react` o similar para renderizar códigos de invitación.
- **Gráficos (opcional):** Recharts o CSS puro para estadísticas por categoría con colores dinámicos.
- **Estado:** Context API o Zustand si la complejidad de splits/RBAC lo justifica.

---

## 3. Tipos TypeScript (Contrato con el Backend V3)

```typescript
type GroupRole = 'ADMIN' | 'MEMBER';

interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  user?: User;
}

interface CustomCategory {
  id: string;
  group_id: string;
  name: string;
  color_hex: string; // Ej: "#6366f1" — usado en badges y gráficos
}

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

interface ExpenseSplit {
  user_id: string;
  split_type: SplitType;
  split_value: number;
  calculated_amount: number;
}

interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  payer_id: string;
  category: string;       // En transición: string | category_id según evolución del backend
  category_id?: string;   // Cuando existan CustomCategory en API
  date: string;
  splits: ExpenseSplit[];
  payer?: User;
}

interface Balance {
  group_id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;
  is_optimized: boolean;
}

interface Invitation {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string;
}

interface AuditLog {
  id: string;
  group_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'EXPENSE' | 'GROUP_MEMBER' | 'CATEGORY';
  entity_id: string;
  performed_by: string;
  timestamp: string;
  details: string; // JSON stringificado con diff antes/después
}
```

---

## 4. Arquitectura de la UI

### 4.1. Estructura de carpetas ampliada

```
frontend/src/
├── components/
│   ├── expenses/
│   │   ├── SplitEditor.tsx         # Editor de reparto avanzado
│   │   ├── SplitTypeSelector.tsx   # Tabs: Igual / Exacto / % / Partes
│   │   └── SplitPreview.tsx        # Resumen antes de guardar
│   ├── invitations/
│   │   ├── InviteModal.tsx         # Genera enlace + QR
│   │   └── JoinGroupPage.tsx       # /join/:token
│   ├── rbac/
│   │   ├── RoleBadge.tsx           # Badge ADMIN / MEMBER
│   │   └── PermissionGate.tsx      # Render condicional por rol
│   ├── categories/
│   │   ├── CategoryManager.tsx     # CRUD categorías del grupo
│   │   └── CategoryBadge.tsx       # Pill con color_hex
│   ├── balances/
│   │   └── OptimizeToggle.tsx      # Switch optimize=true/false
│   └── audit/
│       └── AuditLogPanel.tsx       # Timeline de cambios
├── hooks/
│   ├── useGroupRole.ts             # Rol del usuario en grupo activo
│   └── usePermissions.ts           # canEdit, canDelete, canInvite, canAdmin
└── utils/
    └── splitValidation.ts          # Validaciones client-side de splits
```

### 4.2. Rutas nuevas

| Ruta | Componente | Acceso |
|------|------------|--------|
| `/join/:token` | `JoinGroupPage` | Autenticado (redirige a login si no hay sesión) |
| `/groups/:groupId/settings` | `GroupSettingsPage` | ADMIN |
| `/groups/:groupId/audit` | `AuditLogPage` | ADMIN (o todos si se abre lectura) |

### 4.3. Pestañas del grupo activo (V3)

1. **Balances** — con toggle de optimización.
2. **Gastos** — formulario con `SplitEditor`.
3. **Estadísticas** — categorías con colores personalizados.
4. **Miembros** — lista con roles + botón "Invitar".
5. **Actividad** *(nuevo)* — Audit Log del grupo.

---

## 5. Componentes Detallados

### 5.1. `SplitEditor`

UI principal para definir cómo se reparte un gasto. Cuatro modos:

| Modo | UI | Validación cliente |
|------|----|--------------------|
| **EQUAL** | Checkboxes de participantes | ≥ 1 participante; backend divide importe |
| **EXACT** | Input € por persona | Suma de importes = total del gasto |
| **PERCENTAGE** | Input % por persona | Suma de % = 100 |
| **SHARES** | Input partes (enteros) | Suma de partes > 0 |

Flujo:
1. Usuario elige modo en `SplitTypeSelector`.
2. Selecciona participantes y rellena valores según modo.
3. `SplitPreview` muestra `calculated_amount` estimado (preview local; el backend es la fuente de verdad).
4. Al enviar, construir array `splits[]` y hacer `POST /expenses`.

Ejemplo payload:
```json
{
  "group_id": "uuid",
  "description": "Cena",
  "amount": 100.00,
  "category": "Comida",
  "payer_id": "uuid-pagador",
  "date": "2026-07-09T20:00:00",
  "splits": [
    { "user_id": "uuid-1", "split_type": "PERCENTAGE", "split_value": 60 },
    { "user_id": "uuid-2", "split_type": "PERCENTAGE", "split_value": 40 }
  ]
}
```

### 5.2. `OptimizeToggle`

Switch en la tab Balances:
- **Off:** `GET /groups/{id}/balances` → `is_optimized: false`
- **On:** `GET /groups/{id}/balances?optimize=true` → `is_optimized: true`

UI:
- Badge "Optimizado" en transferencias cuando `is_optimized === true`.
- Tooltip explicando que reduce el número de pagos entre personas.

### 5.3. `InviteModal`

Disponible para miembros del grupo (mínimo quien pueda invitar — todos los miembros en backend actual).

1. Click "Invitar al grupo" → `POST /groups/{group_id}/generate-invite`.
2. Modal muestra:
   - Enlace copiable: `{origin}/join/{token}`
   - Código QR generado con el enlace
   - Fecha de expiración (`expires_at`, 48h por defecto en backend)
3. Botón "Copiar enlace" con feedback visual.

### 5.4. `JoinGroupPage` (`/join/:token`)

1. Si no autenticado → redirect a `/login?redirect=/join/{token}`.
2. Si autenticado → `POST /groups/join/{token}`.
3. Éxito: toast + redirect a `/groups/{group_id}`.
4. Errores manejados: token expirado, ya miembro, no encontrado.

### 5.5. RBAC — `PermissionGate` y `usePermissions`

```typescript
interface Permissions {
  canCreateExpense: boolean;
  canDeleteExpense: (expense: Expense) => boolean;
  canDeleteGroup: boolean;
  canGenerateInvite: boolean;
  canManageCategories: boolean;
  canViewAuditLog: boolean;
}

function usePermissions(role: GroupRole | null, userId: string): Permissions {
  const isAdmin = role === 'ADMIN';
  return {
    canCreateExpense: role !== null,
    canDeleteExpense: (expense) => isAdmin || expense.payer_id === userId,
    canDeleteGroup: isAdmin,
    canGenerateInvite: role !== null,
    canManageCategories: isAdmin,
    canViewAuditLog: isAdmin,
  };
}
```

Uso en JSX:
```tsx
<PermissionGate allowed={permissions.canDeleteGroup}>
  <button onClick={handleDeleteGroup}>Eliminar grupo</button>
</PermissionGate>
```

### 5.6. `CategoryManager`

Panel en ajustes del grupo (ADMIN):
- Listar categorías del grupo con color.
- Crear/editar/eliminar (cuando el backend exponga endpoints; mientras tanto, gestión local + string `category`).
- Cada categoría renderizada con `CategoryBadge` usando `color_hex`.

Categorías base sugeridas al crear grupo: Comida, Transporte, Alojamiento, Ocio.

### 5.7. `AuditLogPanel`

Timeline vertical ordenada por `timestamp` desc:
- Icono según `action` (CREATE verde, UPDATE ámbar, DELETE rojo).
- Texto: "{Usuario} {action} {entity_type}" + hora relativa.
- Expandir fila → parsear `details` JSON y mostrar diff legible.

> **Dependencia backend:** Requiere endpoint `GET /groups/{id}/audit-logs`. Si no existe aún, dejar componente preparado con mock/placeholder.

---

## 6. Gestión de Estado (ampliación V3)

### 6.1. Estado de rol en grupo activo

```typescript
interface GroupContextV3 extends GroupContextType {
  members: GroupMember[];
  currentUserRole: GroupRole | null;
  refreshMembers: () => Promise<void>;
}
```

Obtener rol del usuario autenticado comparando `user.id` con `members[]`.

### 6.2. Estado de splits en formulario

Estado local en `ExpenseForm` (no global):
```typescript
interface SplitFormState {
  mode: SplitType;
  participants: Array<{
    user_id: string;
    split_value: number;
    selected: boolean;
  }>;
}
```

Reset al cambiar de modo o importe total.

### 6.3. Preferencia de optimización

Persistir en `localStorage` (`tricount_optimize_balances: boolean`) para recordar la preferencia del usuario.

---

## 7. Integración con la API REST (endpoints V3)

| Acción UI | Método | Endpoint |
|-----------|--------|----------|
| Crear gasto con splits | `POST` | `/expenses` (body con `splits[]`) |
| Eliminar gasto | `DELETE` | `/expenses/{id}` (403 si no es pagador ni ADMIN) |
| Balances optimizados | `GET` | `/groups/{id}/balances?optimize=true` |
| Generar invitación | `POST` | `/groups/{id}/generate-invite` |
| Unirse con token | `POST` | `/groups/join/{token}` |
| Eliminar grupo | `DELETE` | `/groups/{id}` (solo ADMIN) |
| Audit log *(futuro)* | `GET` | `/groups/{id}/audit-logs` |
| Categorías CRUD *(futuro)* | `CRUD` | `/groups/{id}/categories` |

### Respuesta de invitación

```json
{
  "id": "uuid",
  "group_id": "uuid",
  "token": "abc123...",
  "created_by": "uuid",
  "expires_at": "2026-07-11T15:00:00"
}
```

### Respuesta de balance optimizado

```json
[
  {
    "group_id": "uuid",
    "debtor_id": "uuid-a",
    "creditor_id": "uuid-b",
    "amount": 25.50,
    "is_optimized": true
  }
]
```

---

## 8. Flujos de Usuario V3

### 8.1. Gasto con reparto desigual (porcentajes)
1. Usuario abre formulario → modo "Porcentaje".
2. Marca Ana (60%) y Bob (40%) sobre un gasto de 100 €.
3. `SplitPreview`: Ana 60 €, Bob 40 €.
4. Guardar → backend valida suma = 100 €.
5. Balances se recalculan vía API.

### 8.2. Invitar amigo al grupo
1. ADMIN o MEMBER abre tab Miembros → "Invitar".
2. Se genera QR + enlace.
3. Amigo abre enlace, inicia sesión, se une automáticamente.
4. Aparece en lista de miembros con rol `MEMBER`.

### 8.3. Optimizar deudas
1. Grupo con 4 personas y 6 deudas cruzadas.
2. Usuario activa "Optimizar deudas".
3. UI muestra 3 transferencias con badge "Optimizado".
4. Comparativa visual opcional: "Antes: 6 pagos → Ahora: 3 pagos".

### 8.4. Intento de borrado sin permiso
1. MEMBER intenta borrar gasto de otro → botón oculto o deshabilitado.
2. Si fuerza la petición → 403 del backend → toast de error.

---

## 9. Diseño y UX V3

- **Badges de rol:** ADMIN en dorado/ámbar, MEMBER en gris neutro.
- **SplitEditor:** tabs horizontales con iconos (=% para porcentaje, pie chart para partes).
- **QR Modal:** fondo glass, QR centrado, instrucciones "Escanea o comparte el enlace".
- **Audit Log:** línea temporal con conector vertical, estilo "activity feed".
- **Categorías:** pills coloreadas en listado de gastos y leyenda del gráfico de estadísticas.
- **Feedback de permisos:** tooltips en botones deshabilitados ("Solo el administrador puede hacer esto").

---

## 10. Validaciones en Cliente (splits)

| Modo | Regla |
|------|-------|
| EQUAL | ≥ 1 participante seleccionado |
| EXACT | Suma de `split_value` === `amount` (±0.01 €) |
| PERCENTAGE | Suma de `split_value` === 100 (±0.01) |
| SHARES | Todos los valores > 0; al menos 1 participante |
| General | Pagador debe estar en el grupo; importe > 0 |

Función utilitaria `validateSplits(amount, splits, mode): ValidationResult`.

---

## 11. Manejo de Errores API

| Código | Mensaje UI |
|--------|------------|
| 401 | Sesión expirada → logout + redirect login |
| 403 | "No tienes permisos para esta acción" |
| 404 | "Recurso no encontrado" (grupo, gasto, invitación) |
| 400 (splits) | Mostrar `detail` del backend ("Sum of splits does not match...") |
| 400 (invite) | "La invitación ha expirado" / "Ya eres miembro" |

---

## 12. Notas de Implementación

1. **Sustituir `participants_ids`** del formulario V2 por el array `splits[]` alineado con el backend V3.
2. **Listado de gastos:** mostrar desglose colapsable por gasto (`splits` con `calculated_amount` por persona).
3. **Backend parcial:** categorías custom y audit log pueden no tener endpoints aún; implementar UI con feature flags o secciones "Próximamente" hasta que la API esté lista.
4. **Roles:** el backend asigna `ADMIN` al creador del grupo y `MEMBER` a quien se une por invitación; reflejar esto en `RoleBadge`.
5. **QR:** el token es la URL completa `/join/{token}`, no solo el token suelto.
6. **Tests recomendados:** validación de splits, permisos de borrado, flujo join con token expirado (tests E2E o de integración con MSW).

---

## 13. Roadmap de migración V2 → V3

1. Añadir `SplitEditor` al formulario de gastos (mantener modo EQUAL como default).
2. Integrar endpoints de invitación + ruta `/join/:token`.
3. Implementar RBAC en UI (`usePermissions`).
4. Añadir toggle de optimización en balances.
5. Sustituir categorías fijas por `CategoryManager` cuando la API lo soporte.
6. Integrar `AuditLogPanel` cuando exista el endpoint.
