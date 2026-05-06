import { Router, Response, NextFunction } from "express";
import { prisma } from "@ttm/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  verifyToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === "ADMIN";
      const now = new Date();

      const taskInclude = {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      } as const;

      // Fetch user's project IDs for scoping
      const projectIds = isAdmin
        ? (
            await prisma.project.findMany({ select: { id: true } })
          ).map((p) => p.id)
        : (
            await prisma.projectMember.findMany({
              where: { userId },
              select: { projectId: true },
            })
          ).map((m) => m.projectId);

      // Run all three queries in parallel
      const [myTasks, overdueTasks, projects, statusCounts] =
        await Promise.all([
          prisma.task.findMany({
            where: { assigneeId: userId, status: { not: "DONE" } },
            include: taskInclude,
            orderBy: [
              { dueDate: { sort: "asc", nulls: "last" } },
              { createdAt: "asc" },
            ],
          }),

          prisma.task.findMany({
            where: {
              assigneeId: userId,
              status: { not: "DONE" },
              dueDate: { lt: now },
            },
            include: taskInclude,
            orderBy: { dueDate: "asc" },
          }),

          prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),

          prisma.task.groupBy({
            by: ["projectId", "status"],
            where: { projectId: { in: projectIds } },
            _count: true,
          }),
        ]);

      // Aggregate status counts per project
      const progressMap = new Map<
        string,
        { todo: number; inProgress: number; done: number }
      >();

      for (const row of statusCounts) {
        if (!progressMap.has(row.projectId)) {
          progressMap.set(row.projectId, {
            todo: 0,
            inProgress: 0,
            done: 0,
          });
        }
        const entry = progressMap.get(row.projectId)!;
        if (row.status === "TODO") entry.todo = row._count;
        else if (row.status === "IN_PROGRESS") entry.inProgress = row._count;
        else if (row.status === "DONE") entry.done = row._count;
      }

      const projectProgress = projects.map((p) => {
        const counts = progressMap.get(p.id) ?? {
          todo: 0,
          inProgress: 0,
          done: 0,
        };
        const total = counts.todo + counts.inProgress + counts.done;
        return {
          projectId: p.id,
          projectName: p.name,
          total,
          done: counts.done,
          inProgress: counts.inProgress,
          todo: counts.todo,
          percentage: total > 0 ? Math.round((counts.done / total) * 100) : 0,
        };
      });

      return res.json({ myTasks, overdueTasks, projectProgress });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
