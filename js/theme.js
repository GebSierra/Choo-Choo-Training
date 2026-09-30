export const ACCENT = { m: '#3B7DD8', a: '#E5484D', s: '#2FB37A' };
export const accentVar = (g) => `var(--${g})`;
export const accentOf = (g) => ACCENT[g] || '#6C5CE7';
