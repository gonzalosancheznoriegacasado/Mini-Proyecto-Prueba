import type { AuditLog } from '../../types';

interface AuditLogPanelProps {
  logs: AuditLog[];
}

const actionColors: Record<AuditLog['action'], string> = {
  CREATE: 'text-emerald-400',
  UPDATE: 'text-amber-400',
  DELETE: 'text-rose-400',
};

export const AuditLogPanel = ({ logs }: AuditLogPanelProps) => {
  if (logs.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">No hay actividad registrada todavía.</div>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`font-semibold ${actionColors[log.action]}`}>{log.action} {log.entity_type}</p>
              <p className="mt-1 text-sm text-gray-400">{log.details}</p>
            </div>
            <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
