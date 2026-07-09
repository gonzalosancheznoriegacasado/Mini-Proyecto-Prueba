export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  payer_id: string;
  category: string;
  date: string;
  participants_ids: string[];
  payer?: User;
}

export interface Balance {
  group_id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;
}

export interface CategoryStatistic {
  category: string;
  total_amount: number;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExpenseCreatePayload {
  group_id: string;
  description: string;
  amount: number;
  payer_id: string;
  category: string;
  date: string;
  participants_ids: string[];
}

export interface ExpenseFiltersState {
  category: string;
  payer_id: string;
  limit: number;
  offset: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const EXPENSE_CATEGORIES = [
  'Comida',
  'Alojamiento',
  'Transporte',
  'Ocio',
  'Compras',
  'Otros',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const TOKEN_KEY = 'tricount_token';
export const ACTIVE_GROUP_KEY = 'tricount_active_group';
