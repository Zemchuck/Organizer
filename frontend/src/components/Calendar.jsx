import React from 'react';            
import './Calendar.css';  // 1) importujesz plik CSS, żeby stylować kalendarz

function Calendar() {                   
    return (
    <div className="calendar-container">
      <h2>Kalendarz</h2>                
      <table className="calendar">               
        <thead>                         
          <tr>                          
            <th>Pn</th><th>Wt</th><th>Śr</th>
            <th>Cz</th><th>Pt</th><th>Sb</th><th>Nd</th>
          </tr>
        </thead>
        <tbody>                         
          <tr>
            <td>1</td><td>2</td><td>3</td><td>4</td>
            <td>5</td><td>6</td><td>7</td>
          </tr>
          {/* 
             Dodaj kolejne <tr> z <td>8</td>…<td>14</td>, 
             potem 15–21, 22–28 i ewentualnie 29–31 w zależności od miesiąca 
          */}
        </tbody>
      </table>
    </div>
  );
}

export default Calendar;                // 9) eksportujesz komponent, żeby można było go użyć w App.js
