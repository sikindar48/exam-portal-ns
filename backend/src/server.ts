import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimit } from "express-rate-limit";

// Import API route handlers from new routes folder
import clientsHandler from "./routes/clients.js";
import profilesHandler from "./routes/profiles.js";
import attemptsHandler from "./routes/attempts.js";
import attemptAnswersHandler from "./routes/attempt-answers.js";
import questionsHandler from "./routes/questions.js";
import testQuestionsHandler from "./routes/test-questions.js";
import testsHandler from "./routes/tests.js";
import userRolesHandler from "./routes/user-roles.js";
import questionFoldersHandler from "./routes/question-folders.js";
import testFoldersHandler from "./routes/test-folders.js";
import statsHandler from "./routes/stats.js";
import createUserHandler from "./routes/create-user.js";
import cloneTestHandler from "./routes/rpc/clone-test.js";
import submitAttemptHandler from "./routes/rpc/submit-attempt.js";
import reportHandler from "./routes/report.js";
import testSectionsHandler from "./routes/test-sections.js";
import proctoringHandler from "./routes/proctoring.js";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8080;

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Security headers for Firebase CORS
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// Configure CORS for decoupled frontend
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
  "https://exam-portal-ns-479112457276.asia-south2.run.app",
  "https://test.nssoftwaresolutions.in"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith(".firebaseapp.com") ||
      origin.endsWith(".pages.dev") || // Support Cloudflare Pages preview/prod deploys
      origin.endsWith(".googleapis.com");

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use("/static", express.static(path.join(process.cwd(), "public")));

// Apply Firebase Auth verification middleware globally
app.use(authMiddleware);

// Rate limiting application
if (process.env.DISABLE_RATE_LIMITER !== "true") {
  app.use("/api", globalLimiter);
}

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────

app.all("/api/clients", clientsHandler);
app.all("/api/profiles", profilesHandler);
app.all("/api/attempts", attemptsHandler);
app.all("/api/attempt-answers", attemptAnswersHandler);
app.all("/api/questions", questionsHandler);
app.all("/api/test-questions", testQuestionsHandler);
app.all("/api/test-sections", testSectionsHandler);
app.all("/api/tests", testsHandler);
app.all("/api/user-roles", userRolesHandler);
app.all("/api/question-folders", questionFoldersHandler);
app.all("/api/test-folders", testFoldersHandler);
app.all("/api/stats", statsHandler);
app.all("/api/create-user", createUserHandler);
app.all("/api/proctoring/events", proctoringHandler);

// RPC / Custom endpoints
app.all("/api/rpc/clone-test", cloneTestHandler);
app.all("/api/rpc/submit-attempt", submitAttemptHandler);
app.all("/api/attempts/:attemptId/report", reportHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Root route greeting/info
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    name: "NS Exam Portal Backend API",
    version: "1.0.0",
    status: "healthy",
  });
});

// 404 handler for API or other unmatched paths
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "API route not found" });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Uncaught error details:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
let server: any = null;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export { app, server };
