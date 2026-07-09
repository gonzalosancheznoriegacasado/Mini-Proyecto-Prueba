import type { GroupRole } from '../../types';

interface RoleBadgeProps {
  role: GroupRole | null;
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  if (!role) return null;

  const isAdmin = role === 'ADMIN';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-gray-300'}`}>
      {role}
    </span>
  );
};
