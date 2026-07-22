import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export const JoinGroupPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Uniéndote al grupo...');

  useEffect(() => {
    const joinGroup = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No se ha proporcionado un token de invitación.');
        return;
      }

      try {
        const { data } = await api.post(`/groups/join/${token}`);
        setStatus('success');
        setMessage(data?.message || 'Te has unido al grupo correctamente.');
        window.setTimeout(() => navigate(`/groups/${data?.group_id || ''}`), 800);
      } catch (error: any) {
        if (error.response?.data?.detail === 'Ya eres miembro de este grupo') {
          setStatus('success');
          setMessage('Ya eres miembro de este grupo.');
          // Redirect to the group page or just /groups
          window.setTimeout(() => navigate('/groups'), 800);
        } else {
          setStatus('error');
          setMessage(error.response?.data?.detail || 'La invitación no es válida o ha expirado.');
        }
      }
    };

    // prevent double execution in Strict Mode if already processed
    let isMounted = true;
    if (isMounted) {
      void joinGroup();
    }
    return () => { isMounted = false; };
  }, [navigate, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 text-gray-100">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Unirse al grupo</h1>
        <p className={`mt-4 text-sm ${status === 'error' ? 'text-rose-300' : 'text-gray-400'}`}>{message}</p>
      </div>
    </div>
  );
};
