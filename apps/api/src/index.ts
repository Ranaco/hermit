/**
 * Hermit KMS API Entry Point
 * Starts the Express server with proper error handling
 */

import { log } from "@hermit/logger";
import { createServer, initializeApp, gracefulShutdown } from "./server";
import { cleanupOldAuditLogs } from "./services/audit.service";
import config from "./config";

const port = config.app.port;

/**
 * Start server
 */
async function start(): Promise<void> {
  try {
    // Initialize application (database, vault, etc.)
    await initializeApp();

    // Create Express app
    const app = createServer();

    // Start listening
    const server = app.listen(port, () => {
      log.info(`🚀 Hermit KMS API running on port ${port}`, {
        environment: config.app.env,
        version: config.app.version,
        apiPrefix: config.app.apiPrefix,
      });

      log.info(
        `📡 API endpoints available at: http://localhost:${port}${config.app.apiPrefix}`,
      );
      log.info(`❤️  Health check: http://localhost:${port}/health`);
      log.info(`🟢 Readiness check: http://localhost:${port}/readyz (internal network only)`);
      log.info(`📊 Status check: http://localhost:${port}/status`);
      
      // Schedule background workers
      cleanupOldAuditLogs().catch(() => {});
      setInterval(() => cleanupOldAuditLogs().catch(() => {}), 24 * 60 * 60 * 1000); // Daily
    });

    // Graceful shutdown handlers
    process.on("SIGTERM", () => {
      log.info("SIGTERM received");
      server.close(() => {
        gracefulShutdown("SIGTERM");
      });
    });

    process.on("SIGINT", () => {
      log.info("SIGINT received");
      server.close(() => {
        gracefulShutdown("SIGINT");
      });
    });

    // Unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      log.error("Unhandled Rejection at:", { promise, reason });
      // Don't exit in production for unhandled rejections
      if (config.app.env !== "production") {
        process.exit(1);
      }
    });

    // Uncaught exceptions
    process.on("uncaughtException", (error) => {
      log.error("Uncaught Exception:", { error });
      // Always exit for uncaught exceptions
      process.exit(1);
    });
  } catch (error) {
    log.error("Failed to start server:", { error });
    process.exit(1);
  }
}

// Start the application
start();
