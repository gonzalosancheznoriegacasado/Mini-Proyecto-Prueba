# Especificaciones del Proyecto: Mini-Tricount (Full-Stack)

## 1. Visión General
Mini-Tricount es una aplicación web que permite a un grupo de amigos registrar gastos compartidos y calcular automáticamente los saldos finales (quién debe dinero a quién). El sistema contará con una interfaz en React y un backend en Python para persistir los datos de forma relacional.

## 2. Stack Tecnológico
- **Frontend:** React (inicializado con Vite) + Tailwind CSS.
- **Gestión de Estado:** React Context API (para manejar el estado global de usuarios y gastos).
- **Backend:** Python (exponiendo una API REST, ej. mediante FastAPI o Flask).
- **Base de Datos:** PostgreSQL (base de datos relacional).
- **Comunicación HTTP:** Axios (para el consumo de la API desde el frontend).

## 3. Modelo de Datos (Interfaces y Entidades)
La base de datos en PostgreSQL y las interfaces del frontend compartirán la siguiente estructura:

```typescript
// Representa a una persona/usuario en el grupo (Tabla: persons)
interface Person {
  id: string;        // UUID generado por PostgreSQL
  name: string;
  created_at: string;
}

// Representa un gasto individual guardado en el servidor (Tabla: expenses)
interface Expense {
  id: string;
  description: string; // Ej: "Cena en pizzería"
  amount: number;      // Cantidad total del gasto
  payer_id: string;    // Foreign Key -> persons.id
  date: string;        // Fecha del gasto
}

// Representa el balance final calculado
interface Balance {
  debtor_id: string;   // ID de quien debe pagar
  creditor_id: string; // ID de a quién le deben
  amount: number;      // Cuánto debe
}