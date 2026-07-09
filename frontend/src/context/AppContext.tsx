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
      console.error(err);
      setError('No se pudieron cargar los gastos del grupo.');
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
      console.error(err);
      setError('No se pudieron cargar los balances del grupo.');
    }
  }, [activeGroup, isAuthenticated]);

  const refreshStatistics = useCallback(async () => {
    if (!isAuthenticated || !activeGroup) {
      setStatistics([]);
      return;
    }

    try {
      const { data } = await api.get<CategoryStatistic[]>(`/groups/${activeGroup.id}/statistics`);
      setStatistics(data ?? []);
    } catch (err: unknown) {
      console.error(err);
      setError('No se pudieron cargar las estadísticas del grupo.');
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
