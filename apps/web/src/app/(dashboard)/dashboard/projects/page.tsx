"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import api from "@/lib/api";

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  taskCount: number;
  doneCount: number;
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<ProjectSummary[]>("/projects");
        setProjects(data);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load projects";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isAdmin = session?.user?.role === "ADMIN";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        {isAdmin && (
          <Link href="/dashboard/projects/new" className="btn-primary">
            New project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-400">
            {isAdmin
              ? "No projects yet. Create your first project."
              : "You haven't been added to any projects yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const progress =
              project.taskCount > 0
                ? Math.round((project.doneCount / project.taskCount) * 100)
                : 0;

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="card group transition-colors hover:border-gray-700"
              >
                <h2 className="font-semibold text-gray-100 group-hover:text-brand-400 transition-colors">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                    {project.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                  <span>{project.memberCount} members</span>
                  <span>{project.taskCount} tasks</span>
                </div>

                {project.taskCount > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
