import React from 'react';
import './HabitPopover.css';

const HabitPopover = ({ 
  habit, 
  isDone, 
  goalTitle, 
  onToggleDone, 
  onEdit, 
  onDelete, 
  onClose 
}) => {
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const formatDuration = (startMin, endMin) => {
    const duration = endMin - startMin;
    return `${duration}m`;
  };

  return (
    <div 
      className="habit-popover-container"
      style={{ "--ev-color": habit.color }}
    >
      <div className="habit-popover">
        <div className="popover-head">
          <strong id="habit-popover-title" className="popover-title">{habit.title}</strong>
          <span className="status">
            {isDone ? "Zrobione" : "Do zrobienia"}
          </span>
        </div>

        {habit.description && (
          <div id="habit-popover-desc" className="popover-desc">
            {habit.description}
          </div>
        )}

        <div className="popover-meta">
          <span>Godzina: {formatTime(habit.startMin)}</span>
          <span>Czas trwania: {formatDuration(habit.startMin, habit.endMin)}</span>
          {goalTitle && (
            <span>Cel: {goalTitle}</span>
          )}
        </div>

        <div className="popover-actions">
          <button 
            className="pop-btn primary" 
            onClick={() => onToggleDone(habit)}
          >
            {isDone ? "Cofnij" : "Oznacz jako zrobione"}
          </button>
          <button 
            className="pop-btn" 
            onClick={() => onEdit(habit)}
          >
            Edytuj
          </button>
          <button 
            className="pop-btn danger" 
            onClick={() => onDelete(habit)}
          >
            Usuń nawyk
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitPopover;
