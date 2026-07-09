import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, PlusCircle, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { EXPENSE_CATEGORIES, type ExpenseCreatePayload } from '../types';

export const GroupPage: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeGroup, groups, setActiveGroup } = useGroup();
  const {
    expenses,
    balances,
    statistics,
    pagination,
    loading,
    error,
    filters,
    setFilters,
    addExpense,
    deleteExpense,
    refreshAll,
  } = useApp();

  const group = useMemo(() => groups.find((item) => item.id === groupId) ?? activeGroup, [activeGroup, groupId, groups]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Comida');
  const [payerId, setPayerId] = useState('');
  const [participantsIds, setParticipantsIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'expenses' | 'stats'>('balances');

  React.useEffect(() => {
    if (group) {
      setActiveGroup(group);
    }
  }, [group, setActiveGroup]);

  React.useEffect(() => {
    if (group) {
      const participantIds = expenses.flatMap((exp) => exp.participants_ids ?? []).filter(Boolean);
      const uniqueParticipants = Array.from(new Set(participantIds));
      if (uniqueParticipants.length > 0) {
        setParticipantsIds(uniqueParticipants);
      } else if (user?.id) {
        setParticipantsIds([user.id]);
      }
    }
  }, [expenses, group, user?.id]);

  const handleToggleParticipant = (memberId: string) => {
    setParticipantsIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  };

  const handleCreateExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group || !description.trim() || !amount || !payerId || participantsIds.length === 0) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);
    try {
      const payload: ExpenseCreatePayload = {
        group_id: group.id,
        description: description.trim(),
        amount: parsedAmount,
        payer_id: payerId,
        category,
        date: new Date().toISOString(),
        participants_ids: participantsIds,
      };
      await addExpense(payload);
      setDescription('');
      setAmount('');
      setCategory('Comida');
      setPayerId('');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (!group) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-8 text-center">
          <h1 className="text-xl font-semibold">Grupo no encontrado</h1>
          <p className="mt-2 text-sm text-gray-400">No existe ese grupo o aún no está disponible.</p>
          <button onClick={() => navigate('/groups')} className="mt-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white">
            Volver a grupos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100">
      <header className="border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/groups')} className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-sm text-indigo-400">Grupo activo</p>
              <h1 className="text-xl font-semibold text-white">{group.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300 sm:block">
              {user?.name}
            </div>
            <button onClick={logout} className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/5">
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-gray-400">Gastos totales</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totalExpenses.toFixed(2)}€</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-gray-400">Balance</p>
            <p className="mt-2 text-2xl font-semibold text-white">{balances.length}</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-gray-400">Estadísticas</p>
            <p className="mt-2 text-2xl font-semibold text-white">{statistics.length}</p>
          </div>
        </section>

        <div className="mb-6 flex gap-3 border-b border-white/10 pb-3">
          {[
            ['balances', 'Balances y deudas'],
            ['expenses', 'Gastos'],
            ['stats', 'Estadísticas'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'balances' | 'expenses' | 'stats')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === key ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'balances' && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="glass rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-white">Cómo saldar las cuentas</h2>
              {balances.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
                  No hay balances para este grupo todavía.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {balances.map((balance, index) => (
                    <div key={`${balance.debtor_id}-${balance.creditor_id}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <p className="font-semibold text-white">{balance.debtor_id} debe</p>
                        <p className="text-sm text-gray-400">a {balance.creditor_id}</p>
                      </div>
                      <div className="text-lg font-semibold text-indigo-400">{balance.amount.toFixed(2)}€</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-white">Registrar gasto</h2>
              <form onSubmit={handleCreateExpense} className="mt-4 space-y-3">
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Importe" type="number" step="0.01" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400">
                  {EXPENSE_CATEGORIES.map((expenseCategory) => (
                    <option key={expenseCategory} value={expenseCategory} className="text-gray-900">{expenseCategory}</option>
                  ))}
                </select>
                <select value={payerId} onChange={(e) => setPayerId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400">
                  <option value="">Selecciona pagador</option>
                  <option value={user?.id}>{user?.name}</option>
                </select>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                  <p className="mb-2 font-medium text-white">Participantes</p>
                  <div className="flex flex-wrap gap-2">
                    {participantsIds.map((memberId) => (
                      <label key={memberId} className="rounded-full border border-white/10 bg-[#0b0f19] px-3 py-1 text-xs">
                        <input type="checkbox" checked className="mr-2" onChange={() => handleToggleParticipant(memberId)} />
                        {memberId}
                      </label>
                    ))}
                  </div>
                </div>
                <button disabled={submitting || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70">
                  <PlusCircle className="w-4 h-4" />
                  {submitting ? 'Guardando...' : 'Crear gasto'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="glass rounded-3xl p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Gastos del grupo</h2>
                <p className="text-sm text-gray-400">Lista paginada con filtros.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={filters.category} onChange={(e) => setFilters({ category: e.target.value, offset: 0 })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                  <option value="">Todas las categorías</option>
                  {EXPENSE_CATEGORIES.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption} className="text-gray-900">{categoryOption}</option>
                  ))}
                </select>
                <button onClick={() => refreshAll()} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
                  Refrescar
                </button>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">No hay gastos para mostrar.</div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{expense.description}</p>
                      <p className="text-sm text-gray-400">{expense.category} • {expense.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-indigo-400">{expense.amount.toFixed(2)}€</p>
                        <p className="text-xs text-gray-400">Pagado por {expense.payer_id}</p>
                      </div>
                      <button onClick={() => deleteExpense(expense.id)} className="rounded-xl border border-red-500/20 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-400">
              <span>Total: {pagination.total}</span>
              <div className="flex items-center gap-2">
                <button disabled={pagination.offset === 0} onClick={() => setFilters({ offset: Math.max(0, pagination.offset - pagination.limit) })} className="rounded-xl border border-white/10 p-2 hover:bg-white/5 disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Offset {pagination.offset}</span>
                <button disabled={pagination.offset + pagination.limit >= pagination.total} onClick={() => setFilters({ offset: pagination.offset + pagination.limit })} className="rounded-xl border border-white/10 p-2 hover:bg-white/5 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white">Estadísticas por categoría</h2>
            {statistics.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">Todavía no hay datos estadísticos para este grupo.</div>
            ) : (
              <div className="mt-6 space-y-3">
                {statistics.map((statistic) => (
                  <div key={statistic.category} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Tag className="w-4 h-4 text-indigo-400" />
                      <span>{statistic.category}</span>
                    </div>
                    <span className="font-semibold text-indigo-400">{statistic.total_amount.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
