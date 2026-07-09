import { useMemo } from 'react';
import type { Group, GroupRole, User } from '../types';

export const useGroupRole = (user: User | null, group: Group | null | undefined) => {
  return useMemo<GroupRole | null>(() => {
    if (!user || !group) return null;
    return 'ADMIN';
  }, [group, user]);
};
