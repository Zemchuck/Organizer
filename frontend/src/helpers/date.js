// src/helpers/date.js
export const toLocalISO = (d) => d.toLocaleDateString("en-CA");
export const mondayOf = (date) => {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // 0-6 (0 = poniedziałek)
  if (dow !== 0) d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
};