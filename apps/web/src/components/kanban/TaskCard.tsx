import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/stores/taskStore";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const isOverdue =
    task.dueDate &&
    task.status !== "DONE" &&
    new Date(task.dueDate) < new Date();

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? { ...listeners, ...attributes } : {})}
      onClick={onClick}
      className={`cursor-grab rounded-lg border border-gray-700 bg-gray-800 p-3 transition-shadow hover:border-gray-600 hover:shadow-lg active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      } ${isDragOverlay ? "rotate-2 shadow-2xl ring-2 ring-brand-500/40" : ""}`}
    >
      <p className="text-sm font-medium text-gray-100">{task.title}</p>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
          {task.description}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {task.assignee && (
          <span className="flex items-center gap-1 rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-400">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-600 text-[9px] font-semibold">
              {task.assignee.name.charAt(0).toUpperCase()}
            </span>
            {task.assignee.name.split(" ")[0]}
          </span>
        )}

        {task.dueDate && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              isOverdue
                ? "bg-red-900/40 text-red-400"
                : "bg-gray-700/60 text-gray-400"
            }`}
          >
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
