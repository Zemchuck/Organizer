import React from "react";

export default function TaskPopover({ task, position, onClose, onDelete, onDeleteSeries, onEdit, onEditSeries }) {
  if (!task) return null;

  const style = {
    top: position.y + 10,
    left: position.x + 10
  };

  const isSeries = task.task_type === "habit" || !!task.series_id;

  return (
    <div className="task-popover" style={style}>
      <div className="popover-header">
        <h4>{task.title}</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      {task.description && <p className="desc">{task.description}</p>}
      <div className="actions single-line">
        <button onClick={() => onEdit(task)}>✏️ Edytuj</button>
        {isSeries && <button onClick={() => onEditSeries(task)}>✏️ Edytuj serię</button>}
        <button onClick={() => onDelete(task)}>🗑 Usuń</button>
        {isSeries && <button onClick={() => onDeleteSeries(task)}>🗑 Usuń serię</button>}
      </div>
    </div>
  );
}