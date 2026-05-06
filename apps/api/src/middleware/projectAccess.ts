import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma } from "@ttm/db";

export async function requireProjectAccess(
  req: AuthRequest,  
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role === "ADMIN") {
    return next();
  }

  const { projectId } = req.params;
  if (!projectId) {
    return res.status(400).json({ error: "Missing projectId" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: req.user.id, projectId },
    },
  });

  if (!membership) {
    return res.status(403).json({ error: "Not a member of this project" });
  }

  next();
}
