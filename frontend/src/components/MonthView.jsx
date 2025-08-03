import React, { useEffect, useMemo, useState } from "react";
import "./MonthView.css";

const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const lastOfMonth  = d => new Date(d.getFullYear(), d.getMonth()+1, 0);

export default function MonthView({ date, enterDayView }) {
  const firstDay = useMemo(() => firstOfMonth(date),[date]);
  const lastDay  = useMemo(() => lastOfMonth(date), [date]);
  const startOffset = (firstDay.getDay()+6)%7;
  const daysArray   = useMemo(() => {
    const total = startOffset + lastDay.getDate();
    const rows  = Math.ceil(total/7)*7;
    return Array.from({length:rows},(_,i)=>{ const d=i-startOffset+1; return d>0&&d<=lastDay.getDate()?d:null; });
  },[startOffset,lastDay]);

  const [taskCounts, setTaskCounts] = useState({});
  useEffect(() => {
    const startISO = firstDay.toISOString().slice(0,10);
    const endISO   = lastDay.toISOString().slice(0,10);
    (async()=>{ try {
      const res=await fetch(`http://localhost:8000/tasks?start_date=${startISO}&end_date=${endISO}`);
      const data=await res.json();
      const map={}; data.forEach(t=>{ map[t.date]=(map[t.date]||0)+1; });
      setTaskCounts(map);
    } catch { setTaskCounts({}); } })();
  },[firstDay,lastDay]);

  const todayISO = new Date().toISOString().slice(0,10);

  return (
    <div className="month-grid">
      {[`Pn`,`Wt`,`Śr`,`Cz`,`Pt`,`Sb`,`Nd`].map(d=>(<div key={d} className="month-head">{d}</div>))}
      {daysArray.map((num,idx)=>{
        const cellDate = num? new Date(date.getFullYear(),date.getMonth(),num):null;
        const iso = cellDate&&cellDate.toISOString().slice(0,10);
        const count = iso?taskCounts[iso]:0;
        const isToday = iso===todayISO;
        return (
          <div
            key={idx}
            className={"month-cell"+(num?"":" empty")+(isToday?" today":"")}
            onClick={()=>iso&&enterDayView?.(cellDate)}
          >
            {num}
            {count>0 && <span className="task-count">{count}</span>}
          </div>
        );
      })}
    </div>
  );
}