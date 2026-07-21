import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setFormError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError('Completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setFormError('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    try {
      await register(name, email, password);
      const from = location.state?.from?.pathname || '/groups';
      navigate(from, { replace: true });
    } catch {
      setFormError('No se pudo crear la cuenta.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-2xl border border-white/10">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-white">Crea tu cuenta</h1>
        <p className="text-sm text-gray-400 text-center mt-2">Gestiona tus grupos y gastos desde un único lugar.</p>

        {(error || formError) && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error || formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-gray-300">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
