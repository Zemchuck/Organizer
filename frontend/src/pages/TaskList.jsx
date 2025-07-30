import React, { useState, useEffect } from "react";
import "./TaskList.css";

function TaskList() {
  //Stan zadań
  const [tasks, setTasks] = useState([]);

  return (
    <div className="task-list">
      <h2>Lista zadań</h2>
      <ul>
        {tasks.map((task, index) => (
          <li key={index}>{task}</li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
