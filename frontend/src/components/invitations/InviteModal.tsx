import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';

interface InviteModalProps {
  open: boolean;
  token?: string;
  expiresAt?: string;
  onClose: () => void;
}

export const InviteModal = ({ open, token, expiresAt, onClose }: InviteModalProps) => {
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (!token) return '';
    return `${window.location.origin}/join/${token}`;
  }, [token]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0f19] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-400">Invitar al grupo</p>
            <h3 className="text-lg font-semibold text-white">Comparte un enlace</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-300">Cerrar</button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl border border-white/10 bg-white p-3 text-center text-sm text-gray-700">
              QR temporal no renderizado
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-400">Enlace de invitación</p>
            <p className="break-all text-sm text-gray-200">{link}</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
            <span>Expira: {expiresAt ? new Date(expiresAt).toLocaleString() : '48h'}</span>
            <button onClick={handleCopy} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10">
              <Copy className="w-4 h-4" />
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
