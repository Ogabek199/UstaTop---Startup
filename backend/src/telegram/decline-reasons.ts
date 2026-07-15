export const DECLINE_REASONS = [
  { key: 'busy', label: '⏳ Bandman', text: 'Usta band' },
  { key: 'far', label: '📍 Hudud uzoq', text: 'Hudud juda uzoq' },
  { key: 'noservice', label: '🚫 Bu xizmatni bajarmayman', text: 'Bu xizmatni bajarmayman' },
  { key: 'notime', label: '🕐 Vaqt mos kelmaydi', text: 'Vaqt mos kelmaydi' },
  { key: 'other', label: '✏️ Boshqa sabab', text: null },
] as const;

export type DeclineReasonKey = (typeof DECLINE_REASONS)[number]['key'];

export function getDeclineReasonText(key: string): string | null {
  const found = DECLINE_REASONS.find((r) => r.key === key);
  return found?.text ?? null;
}
