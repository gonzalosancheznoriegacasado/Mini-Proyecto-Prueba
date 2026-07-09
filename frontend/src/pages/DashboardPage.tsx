import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, PlusCircle, LogOut, Users, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { groups, activeGroup, createGroup, refreshGroups, setActiveGroup, loading, error } = useGroup();
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const newGroup = await createGroup(groupName);
      setGroupName('');
      setActiveGroup(newGroup);
      navigate(`/groups/${newGroup.id}`);
    } finally {
      setCreating(false);
    }
  };

  const summary = useMemo(() => ({
    totalGroups: groups.length,
    activeLabel: activeGroup?.name ?? 'Sin grupo activo',
  }), [activeGroup?.name, groups.length]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100">
      <header className="border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-indigo-400">Mini-Tricount V2</p>
            <h1 className="text-xl font-semibold text-white">Tus grupos</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-300 sm:block">
              {user?.name}
            </div>
            <button onClick={logout} className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/5">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="glass rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-semibold">Resumen</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-400">Grupos</p>
                <p className="mt-1 text-3xl font-semibold text-white">{summary.totalGroups}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-400">Activo</p>
                <p className="mt-1 text-xl font-semibold text-white">{summary.activeLabel}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-white">Crear grupo</h2>
            <p className="mt-1 text-sm text-gray-400">Añade un nuevo viaje, piso o evento.</p>
            <form onSubmit={handleCreateGroup} className="mt-4 space-y-3">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                placeholder="Nombre del grupo"
              />
              <button disabled={creating || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70">
                <PlusCircle className="w-4 h-4" />
                {creating ? 'Creando...' : 'Crear grupo'}
              </button>
            </form>
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Mis grupos</h2>
              <p className="text-sm text-gray-400">Selecciona uno para ver balances, gastos y estadísticas.</p>
            </div>
            <button onClick={refreshGroups} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
              Refrescar
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
              Aún no hay grupos. Crea el primero para empezar.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroup(group);
                    navigate(`/groups/${group.id}`);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${activeGroup?.id === group.id ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{group.name}</h3>
                      <p className="mt-1 text-sm text-gray-400">Creado por {group.created_by}</p>
                    </div>
                    <div className="rounded-full border border-white/10 p-2 text-indigo-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                    <CreditCard className="w-4 h-4" />
                    Abrir grupo
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
