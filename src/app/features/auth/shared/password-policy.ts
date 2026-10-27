/** Política de contraseña Sosamet (alta por link y recuperación). */

export interface PasswordChecks {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export const PASSWORD_REQUIREMENTS: { key: keyof PasswordChecks; label: string }[] = [
  { key: 'minLength', label: 'Mínimo 8 caracteres' },
  { key: 'uppercase', label: 'Al menos una mayúscula' },
  { key: 'number', label: 'Al menos un número' },
  { key: 'special', label: 'Al menos un carácter especial' },
];

export function evaluatePassword(password: string): PasswordChecks {
  const value = String(password || '');
  return {
    minLength: value.length >= 8,
    uppercase: /[A-ZÁÉÍÓÚÑ]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(value),
  };
}

export function isPasswordPolicyOk(password: string): boolean {
  const c = evaluatePassword(password);
  return c.minLength && c.uppercase && c.number && c.special;
}

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.';
