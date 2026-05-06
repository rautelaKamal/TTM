import { create } from "zustand";
import api from "@/lib/api";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: (projectId: string) => Promise<void>;
  addTask: (task: Task) => void;
  moveTask: (
    taskId: string,
    newStatus: Task["status"],
    newPosition: number
  ) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  removeTask: (taskId: string) => void;
  syncFromSocket: (task: Task) => void;
  removeFromSocket: (taskId: string) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<Task[]>(`/projects/${projectId}/tasks`);
      set({ tasks: data, loading: false });
    } catch {
      set({ error: "Failed to load tasks", loading: false });
    }
  },

  addTask: (task) => {
    set((s) => ({
      tasks: s.tasks.some((t) => t.id === task.id)
        ? s.tasks
        : [...s.tasks, task],
    }));
  },

  moveTask: async (taskId, newStatus, newPosition) => {
    const snapshot = [...get().tasks];

    // Optimistic update
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, position: newPosition }
          : t
      ),
    }));

    try {
      await api.patch(`/tasks/${taskId}`, {
        status: newStatus,
        position: newPosition,
      });
    } catch {
      // Rollback on failure
      set({ tasks: snapshot, error: "Failed to move task" });
    }
  },

  updateTask: async (taskId, data) => {
    const snapshot = [...get().tasks];
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
    }));
    try {
      await api.patch(`/tasks/${taskId}`, data);
    } catch {
      set({ tasks: snapshot, error: "Failed to update task" });
    }
  },

  removeTask: (taskId) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  syncFromSocket: (task) => {
    set((s) => ({
      tasks: s.tasks.some((t) => t.id === task.id)
        ? s.tasks.map((t) => (t.id === task.id ? task : t))
        : [...s.tasks, task],
    }));
  },

  removeFromSocket: (taskId) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  clearError: () => set({ error: null }),
}));
