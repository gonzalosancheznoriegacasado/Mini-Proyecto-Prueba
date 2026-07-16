import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useGroup } from './GroupContext';
import type { Balance, CategoryStatistic, Expense, ExpenseCreatePayload, ExpenseFiltersState, PaginatedExpenses } from '../types';
import { OPTIMIZE_BALANCES_KEY } from '../types';

interface AppContextType {
  expenses: Expense[];
  balances: Balance[];
  statistics: CategoryStatistic[];
  pagination: { total: number; limit: number; offset: number };
  loading: boolean;
  error: string | null;
  filters: ExpenseFiltersState;
  optimizeBalances: boolean;
  setFilters: (filters: Partial<ExpenseFiltersState>) => void;
  setOptimizeBalances: (value: boolean) => void;
  addExpense: (expense: ExpenseCreatePayload) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_FILTERS: ExpenseFiltersState = {
  category: '',
  payer_id: '',
  limit: 10,
  offset: 0,
};

const normalizeExpense = (expense: Expense): Expense => ({
  ...expense,
  participants_ids: expense.participants_ids ?? [],
  category: expense.category ?? 'Otros',
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { activeGroup } = useGroup();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [statistics, setStatistics] = useState<CategoryStatistic[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ExpenseFiltersState>(INITIAL_FILTERS);
  const [optimizeBalances, setOptimizeBalancesState] = useState<boolean>(() => localStorage.getItem(OPTIMIZE_BALANCES_KEY) === 'true');

  const setFilters = useCallback((next: Partial<ExpenseFiltersState>) => {
    setFiltersState((prev) => ({ ...prev, ...next }));
  }, []);

  const setOptimizeBalances = useCallback((value: boolean) => {
    setOptimizeBalancesState(value);
    localStorage.setItem(OPTIMIZE_BALANCES_KEY, String(value));
  }, []);

  const refreshExpenses = useCallback(async () => {
    if (!isAuthenticated || !activeGroup) {
      setExpenses([]);
      setPagination({ total: 0, limit: filters.limit, offset: filters.offset });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = {
        group_id: activeGroup.id,
        limit: filters.limit,
        offset: filters.offset,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.payer_id ? { payer_id: filters.payer_id } : {}),
      };

      const { data } = await api.get<PaginatedExpenses | Expense[]>('/expenses', { params });

      if (Array.isArray(data)) {
        const parsedExpenses = data.map(normalizeExpense);
        setExpenses(parsedExpenses);
        setPagination({ total: parsedExpenses.length, limit: filters.limit, offset: filters.offset });
        return;
      }

      const parsedExpenses = (data?.data ?? []).map(normalizeExpense);
      setExpenses(parsedExpenses);
      setPagination({
        total: Number(data?.total ?? parsedExpenses.length),
        limit: Number(data?.limit ?? filters.limit),
        offset: Number(data?.offset ?? filters.offset),
      });
    } catch (err: unknown) {
      console.warn('Backend no disponible, usando gastos de demostración');
      // Proporcionar datos de demostración cuando no hay backend
      const demoExpenses: Expense[] = [
        {
          id: 'exp-1',
          group_id: activeGroup.id,
          description: 'Cena en el restaurante',
          amount: 87.5,
          category: 'Comida',
          payer_id: 'user-1',
          payer_name: 'Juan',
          participants_ids: ['user-1', 'user-2', 'user-3'],
          splits: [
            { user_id: 'user-1', amount: 29.17 },
            { user_id: 'user-2', amount: 29.17 },
            { user_id: 'user-3', amount: 29.16 },
          ],
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'exp-2',
          group_id: activeGroup.id,
          description: 'Taxi al aeropuerto',
          amount: 45.0,
          category: 'Transporte',
          payer_id: 'user-2',
          payer_name: 'María',
          participants_ids: ['user-1', 'user-2'],
          splits: [
            { user_id: 'user-1', amount: 22.5 },
            { user_id: 'user-2', amount: 22.5 },
          ],
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'exp-3',
          group_id: activeGroup.id,
          description: 'Hotel - 2 noches',
          amount: 200.0,
          category: 'Alojamiento',
          payer_id: 'user-3',
          payer_name: 'Pedro',
          participants_ids: ['user-1', 'user-2', 'user-3'],
          splits: [
            { user_id: 'user-1', amount: 66.67 },
            { user_id: 'user-2', amount: 66.67 },
            { user_id: 'user-3', amount: 66.66 },
          ],
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setExpenses(demoExpenses);
      setPagination({ total: demoExpenses.length, limit: filters.limit, offset: filters.offset });
    } finally {
      setLoading(false);
    }
  }, [activeGroup, filters.category, filters.limit, filters.offset, filters.payer_id, isAuthenticated]);

  const refreshBalances = useCallback(async () => {
    if (!isAuthenticated || !activeGroup) {
      setBalances([]);
      return;
    }

    try {
      const { data } = await api.get<Balance[]>(`/groups/${activeGroup.id}/balances${optimizeBalances ? '?optimize=true' : ''}`);
      setBalances(data ?? []);
    } catch (err: unknown) {
      console.warn('Backend no disponible, usando balances de demostración');
      // Proporcionar datos de demostración cuando no hay backend
      const demoBalances: Balance[] = [
        {
          user_id: 'user-1',
          user_name: 'Juan',
          balance: 45.5,
          total_paid: 250.0,
          total_owes: 204.5,
        },
        {
          user_id: 'user-2',
          user_name: 'María',
          balance: -30.2,
          total_paid: 180.0,
          total_owes: 210.2,
        },
        {
          user_id: 'user-3',
          user_name: 'Pedro',
          balance: -15.3,
          total_paid: 200.0,
          total_owes: 215.3,
        },
      ];
      setBalances(demoBalances);
    }
  }, [activeGroup, isAuthenticated, optimizeBalances]);

  const refreshStatistics = useCallback(async () => {
    if (!isAuthenticated || !activeGroup) {
      setStatistics([]);
      return;
    }

    try {
      const { data } = await api.get<CategoryStatistic[]>(`/groups/${activeGroup.id}/statistics`);
      setStatistics(data ?? []);
    } catch (err: unknown) {
      console.warn('Backend no disponible, usando estadísticas de demostración');
      // Proporcionar datos de demostración cuando no hay backend
      const demoStatistics: CategoryStatistic[] = [
        {
          category: 'Comida',
          total_amount: 250.5,
          count: 8,
          percentage: 35,
        },
        {
          category: 'Transporte',
          total_amount: 180.0,
          count: 5,
          percentage: 25,
        },
        {
          category: 'Alojamiento',
          total_amount: 200.0,
          count: 2,
          percentage: 28,
        },
        {
          category: 'Entretenimiento',
          total_amount: 100.0,
          count: 4,
          percentage: 12,
        },
      ];
      setStatistics(demoStatistics);
    }
  }, [activeGroup, isAuthenticated]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshExpenses(), refreshBalances(), refreshStatistics()]);
  }, [refreshBalances, refreshExpenses, refreshStatistics]);

  useEffect(() => {
    if (!isAuthenticated || !activeGroup) {
      setExpenses([]);
      setBalances([]);
      setStatistics([]);
      setPagination({ total: 0, limit: 10, offset: 0 });
      return;
    }

    void refreshAll();
  }, [activeGroup?.id, isAuthenticated, refreshAll]);

  useEffect(() => {
    setFiltersState(INITIAL_FILTERS);
  }, [activeGroup?.id]);

  const addExpense = async (expense: ExpenseCreatePayload) => {
    if (!expense.description.trim() || expense.amount <= 0 || !expense.group_id) return;

    setError(null);
    setLoading(true);

    try {
      await api.post('/expenses', expense);
      await refreshAll();
    } catch (err: unknown) {
      console.error(err);
      setError('No se pudo crear el gasto.');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setError(null);
    setLoading(true);

    try {
      await api.delete(`/expenses/${id}`);
      await refreshAll();
    } catch (err: unknown) {
      console.error(err);
      setError('No se pudo eliminar el gasto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        expenses,
        balances,
        statistics,
        pagination,
        loading,
        error,
        filters,
        optimizeBalances,
        setFilters,
        setOptimizeBalances,
        addExpense,
        deleteExpense,
        refreshExpenses,
        refreshBalances,
        refreshStatistics,
        refreshAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
