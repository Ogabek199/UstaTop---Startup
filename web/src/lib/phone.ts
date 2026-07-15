/** O'zbekiston telefon: +998XXXXXXXXX */
const PHONE_REGEX = /^\+998\d{9}$/;

export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("998")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 9);
  return `+998${digits}`;
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/** Ko'rinish uchun: +998 90 123 45 67 */
export function formatPhoneDisplay(phone: string): string {
  if (!isValidPhone(phone)) return formatPhoneDisplayInput(phone);
  const d = phone.slice(4);
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/** Input maydonida yozish paytida bo'shliqlar bilan formatlash */
export function formatPhoneDisplayInput(canonical: string): string {
  if (!canonical || canonical === "+998") return "+998 ";

  const digits = canonical.startsWith("+998")
    ? canonical.slice(4)
    : formatPhoneInput(canonical).slice(4);

  let result = "+998";
  if (digits.length > 0) result += ` ${digits.slice(0, 2)}`;
  if (digits.length > 2) result += ` ${digits.slice(2, 5)}`;
  if (digits.length > 5) result += ` ${digits.slice(5, 7)}`;
  if (digits.length > 7) result += ` ${digits.slice(7, 9)}`;
  return result;
}

export function normalizePhone(phone: string): string {
  return formatPhoneInput(phone);
}
