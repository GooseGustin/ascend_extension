import React, { useEffect, useState } from 'react';
import { GripVertical, Play, Check } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import type { Task } from '../App';
import { getTaskService, AuthService } from '../worker';
import { saveHomeTaskOrder } from '../worker/utils/task-order-storage';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onReorderTasks: (startIndex: number, endIndex: number) => void;
  onStartFocus: (task: Task, questTitle?: string) => void;
}

export function TaskList({ tasks, onToggleTask, onReorderTasks, onStartFocus }: TaskListProps) {
  // Local state for optimistic reordering
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync local state when tasks prop changes
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Optimistic update - reorder locally first
    const reordered = Array.from(localTasks);
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);

    setLocalTasks(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Notify parent of the reorder
    onReorderTasks(draggedIndex, dropIndex);

    // Persist to storage
    try {
      const authService = new AuthService();
      const userId = await authService.getCurrentUserId();

      const orderItems = reordered.map(t => ({
        taskId: t.id,
        questId: t.questId,
      }));

      saveHomeTaskOrder(userId, orderItems);
    } catch (error) {
      console.error('Failed to save task order:', error);
      // Revert on error
      setLocalTasks(tasks);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {localTasks.map((task, index) => (
        <div
          key={task.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`
            border group bg-[#2f3136] rounded px-3 py-3 flex items-center gap-3 cursor-move
            hover:bg-[#34373c] transition-colors
            ${draggedIndex === index ? 'opacity-50' : ''}
            ${dragOverIndex === index && draggedIndex !== index ? 'border-t-2' : ''}
            ${task.completed ? 'opacity-60' : ''}
          `}
          style={{ borderColor: task.questColor }}
        >
          {/* Drag Handle */}
          <GripVertical className="w-4 h-4 text-[#4f545c] group-hover:text-[#72767d] shrink-0" />

          {/* Checkbox */}
          <Checkbox 
            checked={task.completed}
            onCheckedChange={() => onToggleTask(task.id)}
            className="border-[#4f545c] data-[state=checked]:bg-[#57F287] data-[state=checked]:border-[#57F287]"
          />

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${task.completed ? 'line-through text-[#72767d]' : 'text-[#dcddde]'}`}>
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: `${task.questColor}20`, color: task.questColor }}
              >
                {task.questTag}
              </span>
              <span className="text-xs text-[#72767d]">Lvl {task.levelReq}</span>
            </div>
          </div>

          {/* Play Button */}
          {!task.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartFocus(task, task.questTag);
              }}
              className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752C4] flex items-center justify-center group-hover:opacity-100 transition-opacity shrink-0"
            >
              <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
            </button>
          )}

          {task.completed && (
            <div className="w-8 h-8 rounded-full bg-[#57F287] flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

