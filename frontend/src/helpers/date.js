// src/helpers/date.js
export const toLocalISO = (d) => d.toLocaleDateString("en-CA");
export const mondayOf = (date) => {
  const d = new Date(date);
  const dow = d.getDay() || 7; // 1–7 (niedziela = 7)
  if (dow !== 1) d.setDate(d.getDate() - dow + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};