import React from "react";
import "./Calendar.css";
import Reac, { useState } from "react";
/**
 * Calendar component
 * @param {number} [year]  – pełny rok, np. 2025
 * @param {number} [month] – 0‑indeksowany miesiąc (0 = styczeń)

*/
function Calendar({ year, month }) {
  //Pobierz dzisiejszą datę
  const today = new Date();
  //Ustal rok i miesiąc do wyświetlenia
  const currentYear = year ?? today.getFullYear(); //Jeżeli wartość `year` lub `month` jest null lub undefined- nie podana, użyj dzisiejszej daty.
  const currentMonth = month ?? today.getMonth();
  //Ustal pierwszy dzień w miesiącu
  const firstOfMonth = new Date(currentYear, currentMonth, 1); // dzień nie jest indeskowany, więc używamy 1.
  //Układamy array tak, aby pierwszy dzień miesiąca był poniedziałkiem.
  const firstDay = (firstOfMonth.getDay() + 6) % 7; //getDay() zwraca dzień tygodnia (0 = niedziela, 1 = poniedziałek)
  //Obliczamy liczbę dni w miesiącu
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); //day=0, oznacza ostatni dzień poprzedniego miesiąca, więc żeby policzyć aktualny +1.


  //Tworzymy tablicę tygodni
  const weeks = [];
  //1 - to pierwszy dzień miesiąca, jeżeli pierwszy dzień miesiąca wypada w środę FirstDay=2, to otrzymujem liczbę ujemną lub zero.
  //Te wartości oznaczają, puste komórki w tabeli, które są przed pierwszym dniem miesiąca.
  let dayCounter = 1 - firstDay;
  //Dla day <= 0 wstawiamy null, aby nie wyświetlać pustych komórek, powstają puste pola przed pierwszym dniem miesiąca.
  while (dayCounter <= daysInMonth) {
    const week = Array.from({ length: 7 }, (_, idx) => { //Array.from o określonej długości 7,
    //  + funkcja mapująca, _ oznacza, że nie używamy tej wartości, idx to indeks od 0 do 6.
      const day = dayCounter + idx; // Dla każdego dnia tygodnia liczony jest jego numer w miesiącu
      return day > 0 && day <= daysInMonth ? day : null; // Sprawdzamy, czy dzień jest w zakresie miesiąca, jeżeli nie zwraca null
    });
    weeks.push(week); // Gotowy tydzień dodajemy do tablicy weeks
    dayCounter += 7; // Przesuwamy licznik o 7, aby przejść do następnego tygodnia
  }

  return (
    <div className="calendar-container">
      <h2 className="outlined-text">
        {firstOfMonth.toLocaleDateString("pl-PL", {
          month: "long",
          year: "numeric",
        })}
      </h2>
      <table className="calendar">
        <thead>
          <tr className="outlined-text">
            <th>Pn</th>
            <th>Wt</th>
            <th>Śr</th>
            <th>Cz</th>
            <th>Pt</th>
            <th>Sb</th>
            <th>Nd</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => (
                <td
                key={j}
                className={[
                  !day ? 'empty' : '',
                  day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                    ? 'today'
                    : ''
                ].join(' ')}
              >
                {day ?? ""}
              </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Calendar;
