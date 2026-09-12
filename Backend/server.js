import http from 'http';
import express from 'express';
import app from './src/app.js';
import dns from "node:dns/promises";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { connectRedis, closeRedis, getRedisClient } from './src/config/redis.js';
import { initializeQueues, closeBullMQConnection } from './src/queues/index.js';

import { logger } from './src/utils/logger.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';
import { initSocket, initRedisEmitter } from './src/config/socket.js';
import { logVoipConfigurationWarnings } from './src/core/notifications/voip.service.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
let server = null;
let socketServer = null;

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    const closePromises = [];
    if (server) {
        closePromises.push(new Promise((resolve) => server.close(resolve)));
    }
    if (socketServer) {
        closePromises.push(new Promise((resolve) => socketServer.close(resolve)));
    }
    await Promise.all(closePromises);
    try {
        await disconnectDB();
        if (config.redisEnabled) {
            await closeRedis();
        }
        await closeBullMQConnection();
        logger.info('Graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.error(`Shutdown error: ${err.message}`);
        process.exit(1);
    }
    setTimeout(() => {
        logger.error('Shutdown timeout, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

const startServer = async () => {
    try {
        validateConfig();
        logger.info(
            `[Bootstrap] Starting API server with redisEnabled=${config.redisEnabled} bullmqEnabled=${config.bullmqEnabled} host=${config.host} port=${config.port} socketPort=${config.socketPort}`
        );
        // 1. Connect to Database (MongoDB)
        await connectDB();

        initializeFirebaseRealtime();
        logVoipConfigurationWarnings();

        // 2. Create HTTP server from Express app
        const httpServer = http.createServer(app);

        // 3. Connect Redis if enabled
        if (config.redisEnabled) {
            logger.info('[Bootstrap] Redis is enabled; connecting Redis client');
            await connectRedis();
            const rClient = getRedisClient();
            if (rClient) {
                initRedisEmitter(rClient);
            }
        }

        // 4. Initialize Socket.IO Server (Port 5001 by default)
        try {
            const socketApp = express();
            socketApp.get('/health', (req, res) => {
                res.json({ status: 'ok', service: 'socket', port: config.socketPort || 5001 });
            });
            const socketHttpServer = http.createServer(socketApp);
            await initSocket(socketHttpServer);
            const sPort = Number(config.socketPort) || 5001;
            socketServer = socketHttpServer.listen(sPort, config.host, () => {
                logger.info(`Socket.IO Server running on ${config.host}:${sPort}`);
                console.log(`⚡ [Socket URL] http://localhost:${sPort}`);
            });
            socketServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    logger.warn(`[SocketInit] Port ${sPort} already in use (e.g. standalone socket-server.js running). Continuing...`);
                } else {
                    logger.error(`Socket Server Error: ${err.message}`);
                }
            });
        } catch (sockErr) {
            logger.error(`Socket initialization error: ${sockErr.message}`);
        }

        // Watchdog recovered stuck orders is moved to scheduler-server.js

        // 5. Conditionally initialize BullMQ queues.
        // BullMQ requires Redis; skip queue bootstrap when Redis is disabled.
        if (config.bullmqEnabled && config.redisEnabled) {
            try {
                initializeQueues();
            } catch (err) {
                logger.error(`BullMQ initialization error (server continues): ${err.message}`);
            }
        } else if (config.bullmqEnabled && !config.redisEnabled) {
            logger.warn('BullMQ is enabled but Redis is disabled. Queue initialization skipped.');
        }

        // 6. Start the HTTP server
        server = httpServer.listen(config.port, config.host, () => {
            logger.info(`Server running in ${config.nodeEnv} mode on ${config.host}:${config.port}`);
            console.log(`🌐 [URL] http://localhost:${config.port}`);
        });

        // Schedulers (expire offers, fssai sync) are moved to scheduler-server.js

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle server errors (like EADDRINUSE)
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use. Please kill the process or use a different port.`);
            } else {
                logger.error(`Server Error: ${err.message}`);
            }
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                if (server) server.close(() => process.exit(1));
                else process.exit(1);
            }
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();


