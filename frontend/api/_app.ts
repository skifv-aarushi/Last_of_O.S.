import express from "express";
import cors from "cors";
import authRouter from "./_routes/auth.js";
import sessionRouter from "./_routes/session.js";
import minigameRouter from "./_routes/minigame.js";
import authorityRouter from "./_routes/authority.js";
import auditorRouter from "./_routes/auditor.js";
import lobbyRouter from "./_routes/lobby.js";
import adminRouter from "./_routes/admin.js";

export function createApi() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRouter);
  app.use("/api/lobby", lobbyRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/session", sessionRouter);
  app.use("/api/session", minigameRouter);
  app.use("/api/session", authorityRouter);
  app.use("/api/session", auditorRouter);

  app.get("/api/ping", (_req, res) => { res.send("pong"); });

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });
  return app;
}
