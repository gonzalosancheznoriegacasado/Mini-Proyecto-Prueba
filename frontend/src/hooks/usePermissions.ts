import { useMemo } from 'react';
import type { Expense, GroupRole } from '../types';

export interface Permissions {
  canCreateExpense: boolean;
  canDeleteExpense: (expense: Expense) => boolean;
  canDeleteGroup: boolean;
  canGenerateInvite: boolean;
  canManageCategories: boolean;
  canViewAuditLog: boolean;
}

export const usePermissions = (role: GroupRole | null, userId: string | undefined): Permissions => {
  return useMemo(() => {
    const isAdmin = role === 'ADMIN';
    return {
      canCreateExpense: role !== null,
      canDeleteExpense: (expense) => isAdmin || expense.payer_id === userId,
      canDeleteGroup: isAdmin,
      canGenerateInvite: role !== null,
      canManageCategories: isAdmin,
      canViewAuditLog: isAdmin,
    };
  }, [role, userId]);
};
