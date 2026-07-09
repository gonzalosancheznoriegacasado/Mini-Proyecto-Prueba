import type { ExpenseSplit, SplitType } from '../types';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateSplits = (amount: number, splits: ExpenseSplit[], mode: SplitType): ValidationResult => {
  if (amount <= 0) {
    return { isValid: false, message: 'El importe debe ser mayor que cero.' };
  }

  if (splits.length === 0) {
    return { isValid: false, message: 'Selecciona al menos un participante.' };
  }

  if (mode === 'EQUAL') {
    return splits.length > 0
      ? { isValid: true }
      : { isValid: false, message: 'Selecciona al menos un participante.' };
  }

  if (mode === 'EXACT') {
    const total = splits.reduce((sum, split) => sum + split.split_value, 0);
    const difference = Math.abs(total - amount);
    return difference <= 0.01
      ? { isValid: true }
      : { isValid: false, message: `La suma debe ser ${amount.toFixed(2)}€.` };
  }

  if (mode === 'PERCENTAGE') {
    const total = splits.reduce((sum, split) => sum + split.split_value, 0);
    const difference = Math.abs(total - 100);
    return difference <= 0.01
      ? { isValid: true }
      : { isValid: false, message: 'La suma de porcentajes debe ser 100%.' };
  }

  if (mode === 'SHARES') {
    const total = splits.reduce((sum, split) => sum + split.split_value, 0);
    return total > 0
      ? { isValid: true }
      : { isValid: false, message: 'Las partes deben sumar más de cero.' };
  }

  return { isValid: false, message: 'Modo de reparto no soportado.' };
};
