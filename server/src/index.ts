import "dotenv/config";

import express from "express";
import cors from "cors";

import sourcingRouter from "./routes/sourcing";

const app = express();

const PORT =
  Number(process.env.PORT) || 3001;


/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});


/* =========================
   SOURCING API
========================= */

app.use(
  "/api/search",
  sourcingRouter
);


/* =========================
   INVALID JSON HANDLER
========================= */

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (
      error instanceof SyntaxError &&
      "body" in error
    ) {
      res.status(400).json({
        error:
          "Invalid JSON request body",
      });

      return;
    }

    next(error);
  }
);


/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      error:
        "Internal server error",
    });
  }
);


/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});