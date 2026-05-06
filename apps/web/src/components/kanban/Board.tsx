"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { useTaskStore, type Task } from "@/stores/taskStore";
import { getSocket } from "@/lib/socket";

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

interface BoardProps {
  projectId: string;
  onTaskClick: (task: Task) => void;
}

export function Board({ projectId, onTaskClick }: BoardProps) {
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    moveTask,
    addTask,
    syncFromSocket,
    removeFromSocket,
    clearError,
  } = useTaskStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchTasks(projectId);
  }, [projectId, fetchTasks]);

  // Socket.IO subscription
  const connectSocket = useCallback(async () => {
    try {
      const socket = await getSocket();
      socket.emit("project:join", projectId);

      socket.on("task:created", (task: Task) => addTask(task));
      socket.on("task:updated", (task: Task) => syncFromSocket(task));
      socket.on("task:deleted", (data: { taskId: string }) =>
        removeFromSocket(data.taskId)
      );

      return () => {
        socket.emit("project:leave", projectId);
        socket.off("task:created");
        socket.off("task:updated");
        socket.off("task:deleted");
      };
    } catch {
      // Socket failed — app still works without real-time
      return () => {};
    }
  }, [projectId, addTask, syncFromSocket, removeFromSocket]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    connectSocket().then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [connectSocket]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task["status"];
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const tasksInTarget = tasks.filter((t) => t.status === newStatus);
    const maxPos =
      tasksInTarget.length > 0
        ? Math.max(...tasksInTarget.map((t) => t.position)) + 1
        : 0;

    await moveTask(taskId, newStatus, maxPos);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-xs text-red-500 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={tasks
                .filter((t) => t.status === col.id)
                .sort((a, b) => a.position - b.position)}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
