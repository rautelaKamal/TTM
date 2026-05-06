import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import { prisma } from "@ttm/db";
import authRouter from "./routes/auth";
import projectsRouter from "./routes/projects";
import tasksRouter from "./routes/tasks";
import dashboardRouter from "./routes/dashboard";
import { setupSocket } from "./socket";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.API_PORT || 4000;

// Attach Socket.IO to the HTTP server and expose it to route handlers
const io = setupSocket(httpServer);
app.set("io", io);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/auth", authRouter);
app.use("/projects", projectsRouter);
app.use(tasksRouter);
app.use("/dashboard", dashboardRouter);

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

interface ApiError extends Error {
  statusCode?: number;
}

app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  console.error(`[API Error] ${err.message}`, err.stack);
  res.status(statusCode).json({ error: message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.warn(`[api] running on http://localhost:${PORT}`);
});

export default app;
