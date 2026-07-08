# Especificaciones del Proyecto: Mini-Tricount (Full-Stack) - Versión 3

## 1. Visión General (V3)
Mini-Tricount V3 es la evolución definitiva de la aplicación de gestión de gastos compartidos. Esta versión introduce características de nivel empresarial y mayor flexibilidad para los usuarios. Ahora el sistema soporta un algoritmo de optimización de deudas (para minimizar el número de transferencias), reparto de gastos no equitativo (porcentajes, partes o cantidades exactas), un sistema de roles y permisos (RBAC), invitaciones dinámicas mediante tokens o códigos QR, categorías personalizadas por grupo, y un registro de auditoría (Audit Log) exhaustivo para rastrear cualquier modificación en los datos.

## 2. Stack Tecnológico
- **Frontend:** React (Vite) + Tailwind CSS.
- **Gestión de Estado:** React Context API / Zustand.
- **Backend:** Python (FastAPI/Flask/Django) impulsado por `antigravity`.
- **Infraestructura:** Docker (para contenerización de la BD y la API).
- **Seguridad:** JWT (JSON Web Tokens) para autenticación y sistema RBAC en base de datos.
- **Base de Datos:** PostgreSQL.
- **Comunicación HTTP:** Axios.

---

## 3. Modelo de Datos (Entidades y Base de Datos)
La base de datos en PostgreSQL se amplía considerablemente para soportar las nuevas lógicas. Las interfaces principales serán:

```typescript
// Representa a un usuario registrado en el sistema
interface User {
  id: string;        // UUID 
  name: string;
  email: string;
  created_at: string;
}

// Representa un grupo de gastos
interface Group {
  id: string;
  name: string;
  created_by: string; // Foreign Key -> users.id (Propietario original)
  created_at: string;
}

// NUEVO V3: Relación Usuario-Grupo con Sistema de Roles (RBAC)
interface GroupMember {
  group_id: string;   // Foreign Key -> groups.id
  user_id: string;    // Foreign Key -> users.id
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'; // Permisos en el grupo
  joined_at: string;
}

// NUEVO V3: Categorías personalizadas por grupo
interface CustomCategory {
  id: string;
  group_id: string;   // Foreign Key -> groups.id
  name: string;       // Ej: "Cervezas", "Entradas Museo"
  color_hex: string;  // Para el UI en el frontend
}

// Representa un gasto - ACTUALIZADO V3 (Reparto no equitativo)
interface Expense {
  id: string;
  group_id: string;
  description: string; 
  amount: number;      
  payer_id: string;
  category_id: string; // Refiere a CustomCategory.id (o categoría base)
  date: string;        
  // NUEVO V3: Detalle de cómo se divide el gasto. 
  // Sustituye al antiguo participants_ids: string[]
  splits: ExpenseSplit[]; 
}

// NUEVO V3: Detalle del reparto de un gasto (Tabla intermedia expense_splits)
interface ExpenseSplit {
  user_id: string;
  split_type: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
  split_value: number; // Ej: 50 (euros), 25 (%), o 2 (partes)
  calculated_amount: number; // El valor real calculado en backend que debe esa persona
}

// Representa el balance final calculado - ACTUALIZADO V3
interface Balance {
  group_id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;
  is_optimized: boolean; // Indica si este balance pasó por el algoritmo de simplificación
}

// NUEVO V3: Sistema de Invitaciones
interface Invitation {
  id: string;
  group_id: string;
  token: string;       // Token único (usado también para generar QR en el frontend)
  created_by: string;  // user_id de quien invita
  expires_at: string;  // Fecha de caducidad de la invitación
}

// NUEVO V3: Historial de Cambios (Audit Log)
interface AuditLog {
  id: string;
  group_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'EXPENSE' | 'GROUP_MEMBER' | 'CATEGORY';
  entity_id: string;   // ID del registro afectado
  performed_by: string; // user_id de quien hizo el cambio
  timestamp: string;
  details: string;     // JSON en texto con el "antes" y "después"
}