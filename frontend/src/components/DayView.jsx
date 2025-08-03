import React, { useEffect, useState, useMemo } from "react";
import "./DayView.css";

export default function DayView({ date }) {
  const [tasks, setTasks] = useState([]);
  const isoDate = date.toISOString().slice(0,10);

  useEffect(() => {
    (async()=>{ try {
      const res=await fetch(`http://localhost:8000/tasks?start_date=${isoDate}&end_date=${isoDate}`);
      const data=await res.json(); setTasks(data);
    } catch { setTasks([]); } })();
  },[isoDate]);

  const hours = useMemo(() => [...Array(24).keys()],[]);
  const tasksByHour = useMemo(() => {
    const map=Object.fromEntries(hours.map(h=>[h,[]]));
    tasks.forEach(t=>{ const h=new Date(t.time).getHours(); map[h]?.push(t); });
    return map;
  },[tasks,hours]);

  return (
    <div className="day-view-container">
      <div className="hours-column">
        {hours.map(h=>(<div key={h} className="hour-label">{h}:00</div>))}
      </div>
      <div className="tasks-column">
        {hours.map(h=>(<div key={h} className="hour-slot">
          {tasksByHour[h].map(task=>(<div key={task.id} className="task-bar" style={{backgroundColor:task.color, color:'var(--graphite)'}}>{task.title}</div>))}
        </div>))}
        {tasks.length===0 && <div className="no-tasks">Brak zadań w tym dniu</div>}
      </div>
    </div>
  );
}