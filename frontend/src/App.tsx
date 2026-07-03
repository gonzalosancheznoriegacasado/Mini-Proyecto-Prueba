import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Plus, 
  Trash2, 
  DollarSign, 
  ArrowRight, 
  Calendar, 
  Tag, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  UserPlus,
  Server
} from 'lucide-react';
import { useApp } from './context/AppContext';

const App: React.FC = () => {
  const { 
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
  } = useApp();

  // Tab State: 'balances' | 'expenses' | 'members'
  const [activeTab, setActiveTab] = useState<'balances' | 'expenses' | 'members'>('balances');

  // Form States
  const [newMemberName, setNewMemberName] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayer, setExpensePayer] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Validation States
  const [memberError, setMemberError] = useState('');
  const [expenseError, setExpenseError] = useState('');

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');

    if (!newMemberName.trim()) {
      setMemberError('El nombre no puede estar vacío.');
      return;
    }

    if (persons.some(p => p.name.toLowerCase() === newMemberName.trim().toLowerCase())) {
      setMemberError('Este nombre ya existe en el grupo.');
      return;
    }

    await addPerson(newMemberName);
    setNewMemberName('');
  };

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');

    if (!expenseDesc.trim()) {
      setExpenseError('La descripción es requerida.');
      return;
    }

    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpenseError('El monto debe ser un número positivo.');
      return;
    }

    if (!expensePayer) {
      setExpenseError('Debes seleccionar quién pagó.');
      return;
    }

    await addExpense(expenseDesc, amountNum, expensePayer, expenseDate);
    
    // Reset fields except date
    setExpenseDesc('');
    setExpenseAmount('');
    setExpensePayer('');
  };

  // Helper Calculations
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const averageShare = persons.length > 0 ? totalExpenses / persons.length : 0;

  // Helper to find a person's name by ID
  const getPersonName = (id: string) => {
    return persons.find(p => p.id === id)?.name || 'Usuario desconocido';
  };

  // Helper to calculate total paid by a person
  const getPersonTotalPaid = (personId: string) => {
    return expenses
      .filter(exp => exp.payer_id === personId)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col antialiased">
      {/* Top Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full glass border-b border-white/5 transition-all duration-300">
        {/* Loading bar under header */}
        {loading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
        )}
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent m-0 p-0 leading-none">
                Mini-Tricount
              </h1>
              <span className="text-xs text-gray-400 font-medium">Gastos compartidos simplificados</span>
            </div>
          </div>

          {/* Controls: Mode Switch & Reload */}
          <div className="flex items-center space-x-3">
            {/* API / Local Toggle Switch */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              <Server className="w-3.5 h-3.5 text-gray-400" />
              <button
                onClick={() => setApiMode(false)}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition-all ${
                  !isApiMode 
                    ? 'bg-indigo-500 text-white shadow-sm font-bold' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Local
              </button>
              <button
                onClick={() => setApiMode(true)}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition-all ${
                  isApiMode 
                    ? 'bg-purple-500 text-white shadow-sm font-bold' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                API (Axios)
              </button>
            </div>

            {/* Mobile simplified toggle indicator button */}
            <button
              onClick={() => setApiMode(!isApiMode)}
              className="sm:hidden flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400"
              title="Alternar Modo de Datos"
            >
              <span>{isApiMode ? 'API' : 'Local'}</span>
            </button>

            {isApiMode && (
              <button
                onClick={refreshData}
                disabled={loading}
                className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Refrescar Datos desde API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {!isApiMode && persons.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres borrar todos los datos del grupo y gastos locales?')) {
                    clearAll();
                  }
                }}
                className="px-2.5 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden md:inline">Reiniciar Local</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        
        {/* Error Banner for API/Axios Integration */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-sm flex items-start space-x-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-white mb-0.5">Error de Comunicación API</h4>
              <p className="text-gray-300 text-xs leading-relaxed">{error}</p>
              {isApiMode && (
                <button 
                  onClick={() => setApiMode(false)}
                  className="mt-2 text-xs font-bold text-indigo-400 hover:underline block"
                >
                  Volver a modo Local (Datos en memoria)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats Overview */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 animate-slide-up">
          {/* Card 1: Total Gastado */}
          <div className="glass rounded-2xl p-6 relative overflow-hidden transition-all hover:border-indigo-500/30 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-400">Total Gastado</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">
              {totalExpenses.toFixed(2)}€
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Suma de todos los gastos del grupo
            </p>
          </div>

          {/* Card 2: Pago Promedio */}
          <div className="glass rounded-2xl p-6 relative overflow-hidden transition-all hover:border-purple-500/30 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-400">Fracción por Persona</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">
              {averageShare.toFixed(2)}€
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Lo que debería pagar cada integrante
            </p>
          </div>

          {/* Card 3: Participantes */}
          <div className="glass rounded-2xl p-6 relative overflow-hidden transition-all hover:border-emerald-500/30 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-400">Participantes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">
              {persons.length}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Amigos registrados en la cuenta
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 mb-8 space-x-6">
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'balances'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Balances y Deudas</span>
            {balances.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-2xs font-bold bg-indigo-500/20 text-indigo-300 rounded-full">
                {balances.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'expenses'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Gastos</span>
            {expenses.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-2xs font-bold bg-gray-500/20 text-gray-300 rounded-full">
                {expenses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Grupo ({persons.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: BALANCES Y DEUDAS */}
          {activeTab === 'balances' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              
              {/* Debt Settlement Summary Card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <span>Cómo saldar las cuentas</span>
                  </h3>
                  
                  {persons.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="font-semibold text-gray-400">No hay integrantes en el grupo</p>
                      <p className="text-sm mt-1">Ve a la pestaña "Grupo" para añadir amigos.</p>
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="font-semibold text-gray-400">No se han registrado gastos aún</p>
                      <p className="text-sm mt-1">Registra un gasto en la pestaña "Gastos" para ver el balance.</p>
                    </div>
                  ) : balances.length === 0 ? (
                    <div className="text-center py-12 text-emerald-400/80">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <p className="font-bold">¡Las cuentas están saldadas!</p>
                      <p className="text-sm text-gray-400 mt-1">Nadie debe dinero a nadie en este momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {balances.map((bal, idx) => (
                        <div 
                          key={idx} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl transition-all hover:bg-white/5 hover:border-white/10 group"
                        >
                          {/* Debtor */}
                          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-sm">
                              {getPersonName(bal.debtor_id).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-white">{getPersonName(bal.debtor_id)}</span>
                              <span className="text-xs text-red-400 block sm:inline sm:ml-2">debe pagar</span>
                            </div>
                          </div>

                          {/* Arrow and Amount */}
                          <div className="flex items-center space-x-2 justify-center py-2 sm:py-0 border-y border-white/5 sm:border-0 my-2 sm:my-0">
                            <span className="text-lg font-extrabold text-indigo-400">
                              {bal.amount.toFixed(2)}€
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                          </div>

                          {/* Creditor */}
                          <div className="flex items-center space-x-3 justify-end">
                            <span className="text-xs text-emerald-400 mr-2">a</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                              {getPersonName(bal.creditor_id).charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-white">{getPersonName(bal.creditor_id)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Balance Summary List */}
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Saldos Individuales</h3>
                  
                  {persons.length === 0 ? (
                    <p className="text-sm text-gray-500">Agrega personas para ver su balance neto.</p>
                  ) : (
                    <div className="space-y-4">
                      {persons.map(p => {
                        const paid = getPersonTotalPaid(p.id);
                        const net = paid - averageShare;
                        const isCreditor = net > 0.001;
                        const isDebtor = net < -0.001;
                        
                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-gray-300">
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-white block">{p.name}</span>
                                <span className="text-xs text-gray-400">Gastó: {paid.toFixed(2)}€</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`font-bold text-sm ${
                                isCreditor 
                                  ? 'text-emerald-400' 
                                  : isDebtor 
                                    ? 'text-red-400' 
                                    : 'text-gray-400'
                              }`}>
                                {isCreditor ? '+' : ''}{net.toFixed(2)}€
                              </span>
                              <span className="text-3xs text-gray-500 block">
                                {isCreditor ? 'Le deben' : isDebtor ? 'Debe' : 'Saldado'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIAL DE GASTOS */}
          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Form to Add Expense */}
              <div>
                <div className="glass rounded-2xl p-6 sticky top-24">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-indigo-400" />
                    <span>Añadir Gasto</span>
                  </h3>
                  
                  {persons.length === 0 ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-xl text-sm flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>Debes agregar al menos una persona al grupo antes de registrar gastos.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleAddExpense} className="space-y-4">
                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Concepto / Descripción
                        </label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            placeholder="Ej. Cena en pizzería"
                            value={expenseDesc}
                            onChange={(e) => setExpenseDesc(e.target.value)}
                            className="w-full bg-[#111827] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-500"
                          />
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Importe (€)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="w-full bg-[#111827] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-500"
                          />
                        </div>
                      </div>

                      {/* Payer Select */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Pagador
                        </label>
                        <select
                          value={expensePayer}
                          onChange={(e) => setExpensePayer(e.target.value)}
                          className="w-full bg-[#111827] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        >
                          <option value="">Selecciona quién pagó...</option>
                          {persons.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Fecha
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full bg-[#111827] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      {expenseError && (
                        <p className="text-xs font-medium text-red-400 flex items-center space-x-1 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{expenseError}</span>
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 active:scale-95 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Gasto</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Expense List Card */}
              <div className="lg:col-span-2">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Historial de Gastos</h3>
                    <span className="text-xs text-gray-400 font-medium">
                      Mostrando {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
                    </span>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="font-semibold text-gray-400">No hay gastos en la lista</p>
                      <p className="text-xs mt-1">Registra tu primer gasto para empezar a repartir.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expenses.map(exp => (
                        <div 
                          key={exp.id} 
                          className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                              <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm sm:text-base mb-0.5">
                                {exp.description}
                              </h4>
                              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-400">
                                <span>Pagado por: <strong className="text-gray-300 font-semibold">{getPersonName(exp.payer_id)}</strong></span>
                                <span className="hidden sm:inline text-gray-600">•</span>
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3.5 h-3.5 inline text-gray-500" />
                                  <span>{exp.date}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 ml-4">
                            <span className="text-base sm:text-lg font-black text-white shrink-0">
                              {exp.amount.toFixed(2)}€
                            </span>
                            
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              disabled={loading}
                              aria-label="Eliminar gasto"
                              className="w-8 h-8 rounded-lg border border-transparent text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTEGRANTES */}
          {activeTab === 'members' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Form to Add Member */}
              <div>
                <div className="glass rounded-2xl p-6 sticky top-24">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                    <span>Añadir Integrante</span>
                  </h3>
                  
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Nombre completo o apodo
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Ej. Alice Smith"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="w-full bg-[#111827] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    {memberError && (
                      <p className="text-xs font-medium text-red-400 flex items-center space-x-1 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{memberError}</span>
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 active:scale-95 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Integrante</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Members List Card */}
              <div className="lg:col-span-2">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Miembros del Grupo</h3>
                    <span className="text-xs text-gray-400 font-medium">
                      {persons.length} personas registradas
                    </span>
                  </div>

                  {persons.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="font-semibold text-gray-400">No hay nadie registrado</p>
                      <p className="text-xs mt-1">Agrega a tus amigos usando el formulario de la izquierda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {persons.map(p => {
                        const paid = getPersonTotalPaid(p.id);
                        
                        return (
                          <div 
                            key={p.id} 
                            className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{p.name}</h4>
                                <span className="text-xs text-gray-400">Total pagado: {paid.toFixed(2)}€</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (window.confirm(`¿Seguro que quieres eliminar a ${p.name}? Se borrarán también todos sus gastos pagados.`)) {
                                  deletePerson(p.id);
                                }
                              }}
                              disabled={loading}
                              aria-label={`Eliminar a ${p.name}`}
                              className="w-8 h-8 rounded-lg border border-transparent text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 bg-[#070a12]/50 py-6 text-center text-xs text-gray-500">
        <p>© 2026 Mini-Tricount. Cuentas claras para mantener la amistad.</p>
        <p className="mt-1 text-gray-600">Construido con React, TypeScript y Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
