import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config';
import { inspectionRoutes } from './routes/inspection.routes';
import { damageRoutes } from './routes/damage.routes';
import { workOrderRoutes } from './routes/work-order.routes';
import { vendorRoutes } from './routes/vendor.routes';
import { healthRoutes } from './routes/health.routes';
import { RabbitMQUtil } from './utils/rabbitmq.util';
import { usageTrackingMiddleware, flushPendingReports } from './middleware/usage-tracking';

const prisma = new PrismaClient({
  log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error', 'warn'],
});

const server = Fastify({
  logger: {
    level: config.logLevel,
    transport: config.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
  bodyLimit: config.upload.maxFileSize,
});

// Initialize RabbitMQ
const rabbitMQ = new RabbitMQUtil();

// Register plugins
server.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});

server.register(helmet, {
  contentSecurityPolicy: config.isDevelopment ? false : undefined,
});

server.register(jwt, {
  secret: config.jwtSecret,
});

server.register(multipart, {
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Usage tracking middleware (after body parsing)
server.addHook('onRequest', usageTrackingMiddleware);

// Decorate fastify with prisma instance
server.decorate('prisma', prisma);

// Health check routes
server.register(healthRoutes, { prefix: '/health' });

// API routes
server.register(inspectionRoutes, { prefix: '/api/v1/inspections' });
server.register(damageRoutes, { prefix: '/api/v1/damages' });
server.register(workOrderRoutes, { prefix: '/api/v1/work-orders' });
server.register(vendorRoutes, { prefix: '/api/v1/vendors' });

// Global error handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  reply.code(statusCode).send({
    error: error.name || 'Error',
    message,
    statusCode,
    ...(config.isDevelopment && { stack: error.stack }),
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  server.log.info('Received shutdown signal, closing connections...');

  try {
    await flushPendingReports();
    await rabbitMQ.close();
    await prisma.$disconnect();
    await server.close();
    server.log.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  server.log.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  server.log.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    server.log.info('✅ Database connected');

    // Connect to RabbitMQ
    try {
      await rabbitMQ.connect();
    } catch (error) {
      server.log.warn('⚠️  RabbitMQ connection failed (non-critical):', error);
    }

    // Start HTTP server
    await server.listen({
      port: config.port,
      host: config.host,
    });

    server.log.info(`🚀 Damage Tracking & Maintenance Service running on http://${config.host}:${config.port}`);
    server.log.info(`📊 Environment: ${config.isDevelopment ? 'development' : 'production'}`);
    server.log.info(`📝 API Documentation: http://${config.host}:${config.port}/api/v1`);
  } catch (err) {
    server.log.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();

// Type declaration for FastifyInstance with prisma
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
