import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer, type Server } from "http";
import { startScheduler, stopScheduler } from "./scheduler";
import { syncSubscriptionPlans } from "./sync-plans";
import { syncDemoSettings } from "./sync-settings";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export const expressApp = express();

let appReady = false;

expressApp.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

expressApp.use((req, res, next) => {
  if (!appReady && !req.path.startsWith("/api/stripe/webhook")) {
    if (req.path === "/" || !req.path.startsWith("/api")) {
      return res.status(200).send("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Loading...</title><meta http-equiv='refresh' content='3'></head><body><p>Starting up, please wait...</p></body></html>");
    }
    return res.status(503).json({ message: "Application is starting up" });
  }
  next();
});

expressApp.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

expressApp.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

expressApp.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

export async function initialize(httpServer: Server) {
  await registerRoutes(httpServer, expressApp);

  await syncSubscriptionPlans();
  await syncDemoSettings();

  const schedulerTenantId = parseInt(process.env.SCHEDULER_TENANT_ID ?? "8", 10);
  startScheduler(schedulerTenantId);

  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal} — closing server.`);
    stopScheduler();
    httpServer.close(() => {
      log("HTTP server closed.");
      process.exit(0);
    });
  };
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));

  expressApp.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(expressApp);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, expressApp);
  }

  appReady = true;
  log("Application fully initialized");
}

if (process.env.NODE_ENV !== "production") {
  const httpServer = createServer(expressApp);
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  initialize(httpServer);
}
