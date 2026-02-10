import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import sessionRouter from "./routes/session";
import minigameRouter from "./routes/minigame";
import authorityRouter from "./routes/authority";
import auditorRouter from "./routes/auditor";
 
const app = express();
const PORT = process.env.PORT || 3000;
 
app.use(cors());
app.use(express.json());
 
// Register Routes
app.use("/api/auth", authRouter);
app.use("/api/session", sessionRouter);
app.use("/api/session", minigameRouter);
app.use("/api/session", authorityRouter);
app.use("/api/session", auditorRouter);
 
// Health Check
app.get("/ping", (req, res) => { res.send("pong"); });
 
// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});
 
// Start Server
app.listen(PORT, () => {
  console.log(`The Last of O.S. Backend running on http://localhost:${PORT}`);
});

