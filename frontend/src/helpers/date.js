/**
 * Zwraca lokalną datę w formacie YYYY-MM-DD (bez offsetu UTC)
 * np. 2025-08-06
 */
export const toLocalISO = (d) => d.toLocaleDateString("en-CA");

/**
 * Zwraca poniedziałek z tygodnia danej daty (godzina 00:00)
 */
export const mondayOf = (date) => {
  const d = new Date(date);
  const dow = d.getDay() || 7; // 1‑7 (niedziela = 7)
  if (dow !== 1) d.setDate(d.getDate() - dow + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};