import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, PlusCircle, ChevronLeft, ChevronRight, Tag, Users, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { EXPENSE_CATEGORIES, type AuditLog, type CustomCategory, type ExpenseCreatePayload, type ExpenseSplit, type SplitType, type User } from '../types';
import { SplitTypeSelector } from '../components/expenses/SplitTypeSelector';
import { SplitPreview } from '../components/expenses/SplitPreview';
import { InviteModal } from '../components/invitations/InviteModal';
import { AuditLogPanel } from '../components/audit/AuditLogPanel';
import { CategoryManager } from '../components/categories/CategoryManager';
import { RoleBadge } from '../components/rbac/RoleBadge';
import { PermissionGate } from '../components/rbac/PermissionGate';
import { usePermissions } from '../hooks/usePermissions';
import { useGroupRole } from '../hooks/useGroupRole';
import { validateSplits } from '../utils/splitValidation';

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
    optimizeBalances,
    setFilters,
    setOptimizeBalances,
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
  const [splitMode, setSplitMode] = useState<SplitType>('EQUAL');
  const [splitValues, setSplitValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'balances' | 'expenses' | 'stats' | 'members' | 'activity'>('balances');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteToken] = useState('demo-token-v3');
  const [inviteExpiresAt] = useState('');
  const [categories, setCategories] = useState<CustomCategory[]>([
    { id: 'demo-cat-1', group_id: group?.id ?? 'demo', name: 'Comida', color_hex: '#6366f1' },
    { id: 'demo-cat-2', group_id: group?.id ?? 'demo', name: 'Viajes', color_hex: '#14b8a6' },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'demo-log-1',
      group_id: group?.id ?? 'demo',
      action: 'CREATE',
      entity_type: 'EXPENSE',
      entity_id: 'exp-1',
      performed_by: user?.id ?? 'demo-user',
      timestamp: new Date().toISOString(),
      details: 'Se añadió un gasto de comida para el viaje de fin de semana.',
    },
    {
      id: 'demo-log-2',
      group_id: group?.id ?? 'demo',
      action: 'UPDATE',
      entity_type: 'CATEGORY',
      entity_id: 'cat-1',
      performed_by: user?.id ?? 'demo-user',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      details: 'Se actualizó la categoría de transporte para el grupo.',
    },
  ]);

  React.useEffect(() => {
    if (group) {
      setActiveGroup(group);
    }
  }, [group, setActiveGroup]);

  React.useEffect(() => {
    if (group) {
      const participantIds = expenses.flatMap((exp) => exp.participants_ids ?? []).filter(Boolean);
      const uniqueParticipants = Array.from(new Set(participantIds));
      
      const loadMembers = async () => {
        try {
          const { data } = await api.get<User[]>(`/groups/${group.id}/members`);
          setGroupMembers(data);
          
          if (uniqueParticipants.length > 0) {
            setParticipantsIds(uniqueParticipants);
          } else {
            setParticipantsIds(data.map(m => m.id));
          }
        } catch (error) {
          console.error('Failed to load group members', error);
          if (uniqueParticipants.length > 0) {
            setParticipantsIds(uniqueParticipants);
          } else if (user?.id) {
            setParticipantsIds([user.id]);
          }
        }
      };
      
      loadMembers();
    }
  }, [expenses, group, user?.id]);

  const role = useGroupRole(user, group);
  const permissions = usePermissions(role, user?.id);

  const handleToggleParticipant = (memberId: string) => {
    setParticipantsIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  };

  const handleSplitValueChange = (memberId: string, value: string) => {
    setSplitValues((current) => ({ ...current, [memberId]: Number(value) }));
  };

  const handleAddCategory = (name: string, color: string) => {
    const nextCategory: CustomCategory = {
      id: `cat-${Date.now()}`,
      group_id: group?.id ?? 'demo',
      name: name.trim(),
      color_hex: color,
    };
    setCategories((current) => [nextCategory, ...current]);
    setAuditLogs((current) => [
      {
        id: `log-${Date.now()}`,
        group_id: group?.id ?? 'demo',
        action: 'CREATE',
        entity_type: 'CATEGORY',
        entity_id: nextCategory.id,
        performed_by: user?.id ?? 'demo-user',
        timestamp: new Date().toISOString(),
        details: `Se creó la categoría ${nextCategory.name}.`,
      },
      ...current,
    ]);
  };

  const buildSplits = (): ExpenseSplit[] => {
    if (splitMode === 'EQUAL') {
      return participantsIds.map((memberId) => ({
        user_id: memberId,
        split_type: 'EQUAL',
        split_value: 1,
        calculated_amount: 0,
      }));
    }

    return participantsIds.map((memberId) => ({
      user_id: memberId,
      split_type: splitMode,
      split_value: splitValues[memberId] ?? 0,
      calculated_amount: 0,
    }));
  };

  const handleCreateExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group || !description.trim() || !amount || !payerId || participantsIds.length === 0) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const splits = buildSplits();
    const validation = validateSplits(parsedAmount, splits, splitMode);
    if (!validation.isValid) {
      window.alert(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      const payload: ExpenseCreatePayload = {
        group_id: group.id,
        description: description.trim(),
        amount: parsedAmount,
        payer_id: payerId,
        category_id: category,
        date: new Date().toISOString(),
        participants_ids: participantsIds,
        splits,
      };
      await addExpense(payload);
      
      setAuditLogs((current) => [
        {
          id: `log-${Date.now()}`,
          group_id: group.id,
          action: 'CREATE',
          entity_type: 'EXPENSE',
          entity_id: `exp-${Date.now()}`,
          performed_by: user?.id ?? 'demo-user',
          timestamp: new Date().toISOString(),
          details: `Se añadió un gasto: ${description.trim()}.`,
        },
        ...current,
      ]);

      setDescription('');
      setAmount('');
      setCategory('Comida');
      setPayerId('');
      setSplitValues({});
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
          <div className="glass rounded-2xl p-5 animate-card">
            <p className="text-sm text-gray-400">Gastos totales</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totalExpenses.toFixed(2)}€</p>
          </div>
          <div className="glass rounded-2xl p-5 animate-card">
            <p className="text-sm text-gray-400">Balance</p>
            <p className="mt-2 text-2xl font-semibold text-white">{balances.length}</p>
          </div>
          <div className="glass rounded-2xl p-5 animate-card">
            <p className="text-sm text-gray-400">Estadísticas</p>
            <p className="mt-2 text-2xl font-semibold text-white">{statistics.length}</p>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-3 border-b border-white/10 pb-3">
          {[
            ['balances', 'Balances y deudas'],
            ['expenses', 'Gastos'],
            ['stats', 'Estadísticas'],
            ['members', 'Miembros'],
            ['activity', 'Actividad'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'balances' | 'expenses' | 'stats' | 'members' | 'activity')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${activeTab === key ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:-translate-y-0.5'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'balances' && (
          <div key="balances" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] animate-panel">
            <div className="glass rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Cómo saldar las cuentas</h2>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={optimizeBalances} onChange={(e) => setOptimizeBalances(e.target.checked)} />
                  Optimizar deudas
                </label>
              </div>
              {balances.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
                  No hay balances para este grupo todavía.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {balances.map((balance, index) => {
                    const debtorName = groupMembers.find(m => m.id === balance.debtor_id)?.name || balance.debtor_id;
                    const creditorName = groupMembers.find(m => m.id === balance.creditor_id)?.name || balance.creditor_id;
                    return (
                      <div key={`${balance.debtor_id}-${balance.creditor_id}-${index}`} className="hover-lift flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div>
                          <p className="font-semibold text-white">{debtorName} debe</p>
                          <p className="text-sm text-gray-400">a {creditorName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-indigo-400">{balance.amount.toFixed(2)}€</p>
                          {balance.is_optimized && <p className="text-xs text-emerald-400">Optimizado</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-6 hover-lift">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Registrar gasto</h2>
                <RoleBadge role={role} />
              </div>
              <form onSubmit={handleCreateExpense} className="mt-4 space-y-3">
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Importe" type="number" step="0.01" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} className="text-gray-900">{c.name}</option>
                  ))}
                </select>
                <select value={payerId} onChange={(e) => setPayerId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400">
                  <option value="">Selecciona pagador</option>
                  {groupMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                  <p className="mb-2 font-medium text-white">Participantes</p>
                  <div className="flex flex-wrap gap-2">
                    {groupMembers.map((member) => (
                      <label key={member.id} className="rounded-full border border-white/10 bg-[#0b0f19] px-3 py-1 text-xs">
                        <input type="checkbox" checked={participantsIds.includes(member.id)} className="mr-2" onChange={() => handleToggleParticipant(member.id)} />
                        {member.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Reparto del gasto</p>
                    <SplitTypeSelector value={splitMode} onChange={setSplitMode} />
                  </div>
                  {participantsIds.map((memberId) => {
                    const memberName = groupMembers.find(m => m.id === memberId)?.name || memberId;
                    return (
                      <div key={memberId} className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0b0f19]/70 px-3 py-2">
                        <span className="text-sm text-gray-300">{memberName}</span>
                        <input value={splitValues[memberId] ?? ''} onChange={(e) => handleSplitValueChange(memberId, e.target.value)} placeholder={splitMode === 'PERCENTAGE' ? '60' : splitMode === 'EXACT' ? '20.00' : '1'} className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white" />
                      </div>
                    );
                  })}
                  <SplitPreview 
                    amount={Number(amount || 0)} 
                    mode={splitMode} 
                    splits={buildSplits()} 
                    userNames={groupMembers.reduce((acc, m) => ({...acc, [m.id]: m.name}), {})} 
                  />
                </div>
                <PermissionGate allowed={permissions.canCreateExpense} fallback={<p className="text-sm text-gray-400">No tienes permisos para crear gastos en este grupo.</p>}>
                  <button disabled={submitting || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70">
                    <PlusCircle className="w-4 h-4" />
                    {submitting ? 'Guardando...' : 'Crear gasto'}
                  </button>
                </PermissionGate>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div key="expenses" className="glass rounded-3xl p-6 animate-panel">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Gastos del grupo</h2>
                <p className="text-sm text-gray-400">Lista paginada con filtros.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={filters.category} onChange={(e) => setFilters({ category: e.target.value, offset: 0 })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} className="text-gray-900">{c.name}</option>
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
                {expenses.map((expense) => {
                  const payerName = groupMembers.find(m => m.id === expense.payer_id)?.name || expense.payer?.name || expense.payer_id;
                  return (
                    <div key={expense.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover-lift md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-white">{expense.description}</p>
                        <p className="text-sm text-gray-400">{expense.category} • {expense.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-indigo-400">{expense.amount.toFixed(2)}€</p>
                          <p className="text-xs text-gray-400">Pagado por {payerName}</p>
                        </div>
                        <button onClick={() => deleteExpense(expense.id)} className="rounded-xl border border-red-500/20 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
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
          <div key="stats" className="grid gap-6 lg:grid-cols-[1fr_0.8fr] animate-panel">
            <div className="glass rounded-3xl p-6 hover-lift">
              <h2 className="text-lg font-semibold text-white">Estadísticas por categoría</h2>
              {statistics.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">Todavía no hay datos estadísticos para este grupo.</div>
              ) : (
                <div className="mt-6 space-y-3">
                  {statistics.map((statistic) => (
                    <div key={statistic.category} className="hover-lift flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
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
            <CategoryManager categories={categories} onAddCategory={handleAddCategory} />
          </div>
        )}

        {activeTab === 'members' && (
          <div key="members" className="glass rounded-3xl p-6 animate-panel">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Miembros del grupo</h2>
                <p className="text-sm text-gray-400">Invita personas y gestiona la participación.</p>
              </div>
              <PermissionGate allowed={permissions.canGenerateInvite} fallback={<span className="text-sm text-gray-400">Sin permisos para invitar</span>}>
                <button onClick={() => setInviteOpen(true)} className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white">
                  Invitar
                </button>
              </PermissionGate>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover-lift">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-500/10 p-2 text-indigo-400"><Users className="w-4 h-4" /></div>
                <div>
                  <p className="font-semibold text-white">{user?.name}</p>
                  <p className="text-sm text-gray-400">{role ?? 'MEMBER'}</p>
                </div>
                <RoleBadge role={role} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div key="activity" className="glass rounded-3xl p-6 animate-panel">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Actividad reciente</h2>
            </div>
            <AuditLogPanel logs={auditLogs} />
          </div>
        )}
      </main>
      <InviteModal open={inviteOpen} token={inviteToken} expiresAt={inviteExpiresAt} onClose={() => setInviteOpen(false)} />
    </div>
  );
};
