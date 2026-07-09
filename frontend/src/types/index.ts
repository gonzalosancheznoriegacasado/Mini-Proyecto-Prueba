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

export type GroupRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  user?: User;
}

export interface CustomCategory {
  id: string;
  group_id: string;
  name: string;
  color_hex: string;
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface ExpenseSplit {
  user_id: string;
  split_type: SplitType;
  split_value: number;
  calculated_amount: number;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  payer_id: string;
  category: string;
  category_id?: string;
  date: string;
  participants_ids?: string[];
  splits?: ExpenseSplit[];
  payer?: User;
}

export interface Balance {
  group_id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;
  is_optimized?: boolean;
}

export interface Invitation {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: string;
}

export interface AuditLog {
  id: string;
  group_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'EXPENSE' | 'GROUP_MEMBER' | 'CATEGORY';
  entity_id: string;
  performed_by: string;
  timestamp: string;
  details: string;
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
  participants_ids?: string[];
  splits?: ExpenseSplit[];
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
export const OPTIMIZE_BALANCES_KEY = 'tricount_optimize_balances';
