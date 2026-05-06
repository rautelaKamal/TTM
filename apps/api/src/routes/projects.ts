import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "@ttm/db";
import { AuthRequest } from "../middleware/auth";
import { verifyToken } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { requireProjectAccess } from "../middleware/projectAccess";

const router = Router();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email("Valid email required"),
});

// ---------------------------------------------------------------------------
// POST /projects — Admin creates a project, auto-added as first member
// ---------------------------------------------------------------------------

router.post(
  "/",
  verifyToken,
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const project = await prisma.$transaction(async (tx) => {
        const p = await tx.project.create({ data: parsed.data });
        await tx.projectMember.create({
          data: { userId: req.user!.id, projectId: p.id },
        });
        return tx.project.findUniqueOrThrow({
          where: { id: p.id },
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
      });

      return res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /projects — All projects for user (Admin sees all, Member sees own)
// ---------------------------------------------------------------------------

router.get(
  "/",
  verifyToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.role === "ADMIN";

      const projects = await prisma.project.findMany({
        where: isAdmin
          ? {}
          : { members: { some: { userId: req.user!.id } } },
        include: {
          _count: { select: { members: true, tasks: true } },
          tasks: { where: { status: "DONE" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const result = projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        memberCount: p._count.members,
        taskCount: p._count.tasks,
        doneCount: p.tasks.length,
      }));

      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /projects/:projectId — Project detail with members + task summary
// ---------------------------------------------------------------------------

router.get(
  "/:projectId",
  verifyToken,
  requireProjectAccess,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const taskSummary = await prisma.task.groupBy({
        by: ["status"],
        where: { projectId: req.params.projectId },
        _count: true,
      });

      const summary = {
        total: taskSummary.reduce((sum, t) => sum + t._count, 0),
        todo: taskSummary.find((t) => t.status === "TODO")?._count ?? 0,
        inProgress:
          taskSummary.find((t) => t.status === "IN_PROGRESS")?._count ?? 0,
        done: taskSummary.find((t) => t.status === "DONE")?._count ?? 0,
      };

      return res.json({ ...project, taskSummary: summary });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /projects/:projectId/members — Admin adds a member by email
// ---------------------------------------------------------------------------

router.post(
  "/:projectId/members",
  verifyToken,
  requireRole("ADMIN"),
  requireProjectAccess,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = addMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const user = await prisma.user.findFirst({
        where: { email: { equals: parsed.data.email, mode: "insensitive" } },
      });
      if (!user) {
        return res
          .status(404)
          .json({ error: "No user found with that email" });
      }

      const existing = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: req.params.projectId,
          },
        },
      });
      if (existing) {
        return res.status(409).json({ error: "User is already a member" });
      }

      const member = await prisma.projectMember.create({
        data: { userId: user.id, projectId: req.params.projectId },
        include: { user: { select: { name: true, email: true } } },
      });

      return res.status(201).json({
        member: {
          userId: member.userId,
          user: member.user,
          joinedAt: member.joinedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /projects/:projectId/members/:userId — Admin removes a member
// ---------------------------------------------------------------------------

router.delete(
  "/:projectId/members/:userId",
  verifyToken,
  requireRole("ADMIN"),
  requireProjectAccess,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId, userId } = req.params;

      const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
      });
      if (!membership) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (userId === req.user!.id) {
        const otherAdmins = await prisma.projectMember.count({
          where: {
            projectId,
            userId: { not: userId },
            user: { role: "ADMIN" },
          },
        });
        if (otherAdmins === 0) {
          return res.status(400).json({
            error: "Cannot remove yourself as the only Admin in this project",
          });
        }
      }

      await prisma.projectMember.delete({
        where: { userId_projectId: { userId, projectId } },
      });

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
