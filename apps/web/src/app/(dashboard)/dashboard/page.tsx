import Link from "next/link";
import { serverFetch } from "@/lib/serverApi";

interface TaskRow {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  project: { id: string; name: string };
}

interface ProjectProgress {
  projectId: string;
  projectName: string;
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  percentage: number;
}

interface DashboardData {
  myTasks: TaskRow[];
  overdueTasks: TaskRow[];
  projectProgress: ProjectProgress[];
}

export default async function DashboardPage() {
  let data: DashboardData;

  try {
    data = await serverFetch<DashboardData>("/dashboard");
  } catch {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
        Failed to load dashboard. Is the API running?
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Section 1 — My Tasks */}
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight">My Tasks</h2>
        {data.myTasks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No active tasks assigned to you.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.myTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 2 — Overdue Tasks */}
      <section>
        {data.overdueTasks.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-4">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-400">
              All caught up — no overdue tasks.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-red-900/40 bg-red-950/20">
            <div className="border-b border-red-900/30 px-4 py-3">
              <h2 className="text-lg font-bold tracking-tight text-red-400">
                Overdue Tasks
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-red-900/30 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-900/20">
                {data.overdueTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 3 — Project Progress */}
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight">
          Project Progress
        </h2>
        {data.projectProgress.length === 0 ? (
          <p className="text-sm text-gray-500">No projects yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.projectProgress.map((p) => (
              <div
                key={p.projectId}
                className="card transition-colors hover:border-gray-700"
              >
                <Link
                  href={`/dashboard/projects/${p.projectId}/board`}
                  className="text-sm font-semibold text-gray-100 hover:text-brand-400 transition-colors"
                >
                  {p.projectName}
                </Link>

                <p className="mt-1 text-xs text-gray-500">
                  {p.done} / {p.total} tasks done
                </p>

                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.percentage >= 70
                          ? "bg-emerald-500"
                          : p.percentage >= 30
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 flex gap-3 text-[11px] text-gray-500">
                  <span>{p.todo} to do</span>
                  <span>{p.inProgress} in progress</span>
                  <span>{p.done} done</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TaskRow({ task }: { task: TaskRow }) {
  const statusStyles: Record<string, string> = {
    TODO: "bg-gray-700/60 text-gray-300",
    IN_PROGRESS: "bg-amber-900/40 text-amber-400",
  };

  const statusLabels: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
  };

  const now = new Date();
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = due && due < now;
  const isDueToday = due && due.toDateString() === now.toDateString();

  return (
    <tr className="transition-colors hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <Link
          href={`/dashboard/projects/${task.project.id}/board`}
          className="font-medium text-gray-200 hover:text-brand-400 transition-colors"
        >
          {task.title}
        </Link>
      </td>
      <td className="px-4 py-3 text-gray-400">{task.project.name}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
            statusStyles[task.status] ?? ""
          }`}
        >
          {statusLabels[task.status] ?? task.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {due ? (
          <span
            className={`text-xs ${
              isOverdue
                ? "font-medium text-red-400"
                : isDueToday
                  ? "font-medium text-amber-400"
                  : "text-gray-400"
            }`}
          >
            {due.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
    </tr>
  );
}
