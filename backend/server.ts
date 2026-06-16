import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./api/_lib/db.js";
import { getUser } from "./api/_lib/auth.js";
import { randomUUID } from "crypto";

// Import API route handlers
import clientsHandler from "./api/clients.js";
import profilesHandler from "./api/profiles.js";
import attemptsHandler from "./api/attempts.js";
import attemptAnswersHandler from "./api/attempt-answers.js";
import questionsHandler from "./api/questions.js";
import testQuestionsHandler from "./api/test-questions.js";
import testsHandler from "./api/tests.js";
import userRolesHandler from "./api/user-roles.js";
import questionFoldersHandler from "./api/question-folders.js";
import testFoldersHandler from "./api/test-folders.js";
import statsHandler from "./api/stats.js";
import createUserHandler from "./api/create-user.js";
import cloneTestHandler from "./api/rpc/clone-test.js";
import submitAttemptHandler from "./api/rpc/submit-attempt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
// Security headers for Firebase CORS
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(cors({
  origin: [
    "http://localhost:8081",
    "http://localhost:3000",
    "https://exam-portal-ns-479112457276.asia-south2.run.app",
    /\.firebaseapp\.com$/,
    /googleapis\.com$/
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// Serve Frontend Static Files (if built into backend)
// ─────────────────────────────────────────────────────────────────────────────

const frontendDist = path.join(__dirname, "../frontend/dist");
try {
  app.use(express.static(frontendDist, { 
    extensions: ['html', 'js', 'css', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'woff', 'woff2'] 
  }));
} catch (e) {
  console.warn("Frontend dist folder not found. API-only mode.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

app.use(async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUser(req as any);
  if (user) req.user = user;
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────

// Main API routes
app.all("/api/clients", clientsHandler);
app.all("/api/profiles", profilesHandler);
app.all("/api/attempts", attemptsHandler);
app.all("/api/attempt-answers", attemptAnswersHandler);
app.all("/api/questions", questionsHandler);
app.all("/api/test-questions", testQuestionsHandler);
app.all("/api/tests", testsHandler);
app.all("/api/user-roles", userRolesHandler);
app.all("/api/question-folders", questionFoldersHandler);
app.all("/api/test-folders", testFoldersHandler);
app.all("/api/stats", statsHandler);
app.all("/api/create-user", createUserHandler);

// RPC/Custom endpoints
app.all("/api/rpc/clone-test", cloneTestHandler);
app.all("/api/rpc/submit-attempt", submitAttemptHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Attempts Routes (Legacy - keeping for compatibility)
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ─────────────────────────────────────────────────────────────────────────────
// Catch-All: Serve Frontend SPA (must be after all API routes)
// ─────────────────────────────────────────────────────────────────────────────

app.get("*", (req: Request, res: Response) => {
  // For API routes that don't match, return 404
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  
  // For all other routes, try to serve index.html for SPA routing
  const indexPath = path.join(__dirname, "../frontend/dist/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Fallback: return simple HTML if frontend not available
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>NS Exam Portal</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>
            <h1>NS Exam Portal</h1>
            <p>Frontend is being deployed. Please refresh in a moment...</p>
            <p><a href="/">Refresh</a></p>
          </body>
        </html>
      `);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
