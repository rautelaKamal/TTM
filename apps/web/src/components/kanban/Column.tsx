import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/stores/taskStore";

const STATUS_COLORS: Record<string, string> = {
  TODO: "border-gray-600",
  IN_PROGRESS: "border-amber-600",
  DONE: "border-emerald-600",
};

const STATUS_BG: Record<string, string> = {
  TODO: "bg-gray-500/10",
  IN_PROGRESS: "bg-amber-500/10",
  DONE: "bg-emerald-500/10",
};

interface ColumnProps {
  id: "TODO" | "IN_PROGRESS" | "DONE";
  label: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function Column({ id, label, tasks, onTaskClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col rounded-xl border-t-2 ${STATUS_COLORS[id]} ${
        isOver ? "bg-gray-800/80" : "bg-gray-900/50"
      } transition-colors`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-300">{label}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BG[id]} text-gray-300`}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-700 py-8 text-xs text-gray-600">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
