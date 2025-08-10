import React, { useEffect } from "react";
import TaskForm from "./TaskForm.jsx";

export default function TaskPopover({ date, onClose, onCreated }) {
  // zamykanie ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCreated = (created) => {
    onCreated?.(created);
    onClose?.();
  };

  return (
    <div className="popover-backdrop" onClick={onClose}>
      <div className="popover-card" onClick={(e) => e.stopPropagation()}>
        <div className="popover-head">
          <strong>Nowe zadanie</strong>
          <button className="close-btn" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>
        <TaskForm initialDate={date} onCreated={handleCreated} onCancel={onClose} />
      </div>
    </div>
  );
}
