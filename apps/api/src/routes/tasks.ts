import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "@ttm/db";
import { verifyToken, AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { requireProjectAccess } from "../middleware/projectAccess";
import { diffTask, logActivity } from "../services/activityLog";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true, email: true } },
} as const;

// ---- POST /projects/:projectId/tasks ------------------------------------

router.post(
  "/projects/:projectId/tasks",
  verifyToken,
  requireProjectAccess,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      if (parsed.data.assigneeId) {
        const member = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: parsed.data.assigneeId,
              projectId: req.params.projectId,
            },
          },
        });
        if (!member) {
          return res
            .status(400)
            .json({ error: "Assignee is not a project member" });
        }
      }

      const maxPos = await prisma.task.aggregate({
        where: {
          projectId: req.params.projectId,
          status: parsed.data.status,
        },
        _max: { position: true },
      });

      const task = await prisma.task.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          status: parsed.data.status,
          dueDate: parsed.data.dueDate
            ? new Date(parsed.data.dueDate)
            : null,
          assigneeId: parsed.data.assigneeId ?? null,
          position: (maxPos._max.position ?? -1) + 1,
          projectId: req.params.projectId,
          creatorId: req.user!.id,
        },
        include: taskInclude,
      });

      await logActivity(task.id, req.user!.id, "created");

      const io = req.app.get("io");
      if (io) {
        io.to(`project:${req.params.projectId}`).emit("task:created", task);
      }

      return res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  }
);

// ---- GET /projects/:projectId/tasks ------------------------------------

router.get(
  "/projects/:projectId/tasks",
  verifyToken,
  requireProjectAccess,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await prisma.task.findMany({
        where: { projectId: req.params.projectId },
        include: taskInclude,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });

      return res.json(tasks);
    } catch (err) {
      next(err);
    }
  }
);

// ---- PATCH /tasks/:taskId -----------------------------------------------

router.patch(
  "/tasks/:taskId",
  verifyToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = updateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const existing = await prisma.task.findUnique({
        where: { id: req.params.taskId },
      });
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }

      // RBAC: Members can only update their own assigned tasks
      if (
        req.user!.role === "MEMBER" &&
        existing.assigneeId !== req.user!.id
      ) {
        return res
          .status(403)
          .json({ error: "You can only update tasks assigned to you" });
      }

      // Verify project membership for non-admins
      if (req.user!.role !== "ADMIN") {
        const member = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: req.user!.id,
              projectId: existing.projectId,
            },
          },
        });
        if (!member) {
          return res
            .status(403)
            .json({ error: "Not a member of this project" });
        }
      }

      const diffs = diffTask(
        existing as unknown as Record<string, unknown>,
        parsed.data
      );

      const updateData: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.dueDate !== undefined) {
        updateData.dueDate = parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : null;
      }

      const updated = await prisma.task.update({
        where: { id: req.params.taskId },
        data: updateData,
        include: taskInclude,
      });

      if (diffs.length > 0) {
        await logActivity(updated.id, req.user!.id, "updated", diffs);
      }

      const io = req.app.get("io");
      if (io) {
        io.to(`project:${existing.projectId}`).emit("task:updated", updated);
      }

      return res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ---- DELETE /tasks/:taskId — Admin only ---------------------------------

router.delete(
  "/tasks/:taskId",
  verifyToken,
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.task.findUnique({
        where: { id: req.params.taskId },
      });
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }

      await logActivity(existing.id, req.user!.id, "deleted");

      await prisma.task.delete({ where: { id: req.params.taskId } });

      const io = req.app.get("io");
      if (io) {
        io.to(`project:${existing.projectId}`).emit("task:deleted", {
          taskId: existing.id,
          projectId: existing.projectId,
        });
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---- GET /tasks/:taskId/activity ----------------------------------------

router.get(
  "/tasks/:taskId/activity",
  verifyToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
      });
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (req.user!.role !== "ADMIN") {
        const member = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: req.user!.id,
              projectId: task.projectId,
            },
          },
        });
        if (!member) {
          return res
            .status(403)
            .json({ error: "Not a member of this project" });
        }
      }

      const logs = await prisma.activityLog.findMany({
        where: { taskId: req.params.taskId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
