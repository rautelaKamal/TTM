"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Board } from "@/components/kanban/Board";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import type { Task } from "@/stores/taskStore";

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${params.id}`}
            className="text-sm text-gray-500 transition-colors hover:text-gray-300"
          >
            ← Project
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          Add task
        </button>
      </div>

      <Board projectId={params.id} onTaskClick={setSelectedTask} />

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          projectId={params.id}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
