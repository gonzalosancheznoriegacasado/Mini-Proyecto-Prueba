import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Interfaces based on SPEC.md
export interface Person {
  id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payer_id: string;
  date: string;
}

export interface Balance {
  debtor_id: string;
  creditor_id: string;
  amount: number;
}

interface AppContextType {
  persons: Person[];
  expenses: Expense[];
  balances: Balance[];
  loading: boolean;
  error: string | null;
  isApiMode: boolean;
  setApiMode: (enabled: boolean) => void;
  addPerson: (name: string) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  addExpense: (description: string, amount: number, payer_id: string, date: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  clearAll: () => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_PERSONS: Person[] = [
  { id: '1', name: 'Alice', created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '2', name: 'Bob', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '3', name: 'Charlie', created_at: new Date(Date.now() - 3600000 * 1).toISOString() },
  { id: '4', name: 'Diana', created_at: new Date().toISOString() },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Cena en pizzería', amount: 80, payer_id: '1', date: '2026-07-02' },
  { id: 'e2', description: 'Gasolina viaje', amount: 40, payer_id: '2', date: '2026-07-02' },
  { id: 'e3', description: 'Entradas de cine', amount: 30, payer_id: '3', date: '2026-07-03' },
  { id: 'e4', description: 'Compra supermercado', amount: 50, payer_id: '1', date: '2026-07-03' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode selection: Local (Mock) vs API (Axios Backend)
  const [isApiMode, setIsApiMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tricount_api_mode');
    return saved === 'true';
  });

  const [persons, setPersons] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronous localStorage save helper for mock mode
  const saveLocalData = (newPersons: Person[], newExpenses: Expense[]) => {
    if (!isApiMode) {
      localStorage.setItem('tricount_persons', JSON.stringify(newPersons));
      localStorage.setItem('tricount_expenses', JSON.stringify(newExpenses));
    }
  };

  // Switch API Mode and persist choice
  const setApiMode = (enabled: boolean) => {
    setIsApiMode(enabled);
    localStorage.setItem('tricount_api_mode', String(enabled));
    setError(null);
  };

  // Fetch / Load initial data depending on mode
  const refreshData = async () => {
    setLoading(true);
    setError(null);

    if (isApiMode) {
      try {
        // Fetch persons and expenses in parallel using Axios client
        const [personsRes, expensesRes] = await Promise.all([
          api.get<Person[]>('/persons'),
          api.get<Expense[]>('/expenses')
        ]);
        setPersons(personsRes.data);
        setExpenses(expensesRes.data);
      } catch (err: any) {
        console.error('API Error:', err);
        setError(
          'Error al conectar con la API del Backend. Asegúrate de que el servidor esté activo (ej: FastAPI en localhost:8000).'
        );
        // Do not reset UI state immediately so they can see existing screen
      } finally {
        setLoading(false);
      }
    } else {
      // Local Mode: Read from localStorage or use pre-populated mock data
      const savedPersons = localStorage.getItem('tricount_persons');
      const savedExpenses = localStorage.getItem('tricount_expenses');
      
      const loadedPersons = savedPersons ? JSON.parse(savedPersons) : INITIAL_PERSONS;
      const loadedExpenses = savedExpenses ? JSON.parse(savedExpenses) : INITIAL_EXPENSES;
      
      setPersons(loadedPersons);
      setExpenses(loadedExpenses);
      
      // Save initial defaults if not already present
      if (!savedPersons) {
        localStorage.setItem('tricount_persons', JSON.stringify(INITIAL_PERSONS));
      }
      if (!savedExpenses) {
        localStorage.setItem('tricount_expenses', JSON.stringify(INITIAL_EXPENSES));
      }
      setLoading(false);
    }
  };

  // Load data on start or when mode changes
  useEffect(() => {
    refreshData();
  }, [isApiMode]);

  // Calculate balances Reactively when persons or expenses change
  useEffect(() => {
    if (persons.length === 0) {
      setBalances([]);
      return;
    }

    // 1. Calculate paid amounts
    const paidMap: Record<string, number> = {};
    persons.forEach(p => { paidMap[p.id] = 0; });
    expenses.forEach(exp => {
      if (paidMap[exp.payer_id] !== undefined) {
        paidMap[exp.payer_id] += exp.amount;
      }
    });

    // 2. Average share
    const totalPaid = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const averageShare = totalPaid / persons.length;

    // 3. Net balance calculations
    const netBalances = persons.map(p => ({
      id: p.id,
      net: (paidMap[p.id] || 0) - averageShare
    }));

    // 4. Group into debtors and creditors
    const debtors = netBalances
      .filter(x => x.net < -0.001)
      .map(x => ({ id: x.id, amount: Math.abs(x.net) }));
    const creditors = netBalances
      .filter(x => x.net > 0.001)
      .map(x => ({ id: x.id, amount: x.net }));

    // Greedy matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const calculatedBalances: Balance[] = [];
    let dIdx = 0;
    let cIdx = 0;

    const dList = debtors.map(d => ({ ...d }));
    const cList = creditors.map(c => ({ ...c }));

    while (dIdx < dList.length && cIdx < cList.length) {
      const debtor = dList[dIdx];
      const creditor = cList[cIdx];

      if (debtor.amount < 0.01) {
        dIdx++;
        continue;
      }
      if (creditor.amount < 0.01) {
        cIdx++;
        continue;
      }

      const amountToPay = Math.min(debtor.amount, creditor.amount);
      
      calculatedBalances.push({
        debtor_id: debtor.id,
        creditor_id: creditor.id,
        amount: Math.round(amountToPay * 100) / 100
      });

      debtor.amount -= amountToPay;
      creditor.amount -= amountToPay;

      if (debtor.amount < 0.01) dIdx++;
      if (creditor.amount < 0.01) cIdx++;
    }

    setBalances(calculatedBalances);
  }, [persons, expenses]);

  // CRUD Actions
  const addPerson = async (name: string) => {
    if (!name.trim()) return;
    setError(null);

    if (isApiMode) {
      setLoading(true);
      try {
        // Call POST /persons endpoint with the new person name
        await api.post('/persons', { name: name.trim() });
        await refreshData();
      } catch (err: any) {
        console.error(err);
        setError('No se pudo añadir la persona al servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      const newPerson: Person = {
        id: crypto.randomUUID(),
        name: name.trim(),
        created_at: new Date().toISOString()
      };
      const updatedPersons = [...persons, newPerson];
      setPersons(updatedPersons);
      saveLocalData(updatedPersons, expenses);
    }
  };

  const deletePerson = async (id: string) => {
    setError(null);
    if (isApiMode) {
      setLoading(true);
      try {
        // Call DELETE /persons/:id endpoint
        await api.delete(`/persons/${id}`);
        await refreshData();
      } catch (err: any) {
        console.error(err);
        setError('No se pudo eliminar la persona del servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      const updatedPersons = persons.filter(p => p.id !== id);
      // Cascade delete expenses paid by this person
      const updatedExpenses = expenses.filter(exp => exp.payer_id !== id);
      setPersons(updatedPersons);
      setExpenses(updatedExpenses);
      saveLocalData(updatedPersons, updatedExpenses);
    }
  };

  const addExpense = async (description: string, amount: number, payer_id: string, date: string) => {
    if (!description.trim() || amount <= 0 || !payer_id) return;
    setError(null);

    const finalDate = date || new Date().toISOString().split('T')[0];

    if (isApiMode) {
      setLoading(true);
      try {
        // Call POST /expenses endpoint
        await api.post('/expenses', {
          description: description.trim(),
          amount: Number(amount),
          payer_id,
          date: finalDate
        });
        await refreshData();
      } catch (err: any) {
        console.error(err);
        setError('No se pudo añadir el gasto al servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: Number(amount),
        payer_id,
        date: finalDate
      };
      const updatedExpenses = [...expenses, newExpense];
      setExpenses(updatedExpenses);
      saveLocalData(persons, updatedExpenses);
    }
  };

  const deleteExpense = async (id: string) => {
    setError(null);
    if (isApiMode) {
      setLoading(true);
      try {
        // Call DELETE /expenses/:id endpoint
        await api.delete(`/expenses/${id}`);
        await refreshData();
      } catch (err: any) {
        console.error(err);
        setError('No se pudo eliminar el gasto del servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      const updatedExpenses = expenses.filter(exp => exp.id !== id);
      setExpenses(updatedExpenses);
      saveLocalData(persons, updatedExpenses);
    }
  };

  const clearAll = () => {
    if (isApiMode) {
      setError('El reinicio total no está permitido en modo API para evitar pérdida de datos.');
      return;
    }
    setPersons([]);
    setExpenses([]);
    localStorage.removeItem('tricount_persons');
    localStorage.removeItem('tricount_expenses');
  };

  return (
    <AppContext.Provider value={{
      persons,
      expenses,
      balances,
      loading,
      error,
      isApiMode,
      setApiMode,
      addPerson,
      deletePerson,
      addExpense,
      deleteExpense,
      clearAll,
      refreshData
    }}>
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
