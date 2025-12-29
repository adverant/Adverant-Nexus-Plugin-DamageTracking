import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check database connection
      await server.prisma.$queryRaw`SELECT 1`;

      return reply.send({
        status: 'healthy',
        service: 'nexus-damage-tracking',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
      });
    } catch (error) {
      return reply.code(503).send({
        status: 'unhealthy',
        service: 'nexus-damage-tracking',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  server.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await server.prisma.$queryRaw`SELECT 1`;
      return reply.send({ ready: true });
    } catch (error) {
      return reply.code(503).send({ ready: false });
    }
  });

  server.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ alive: true });
  });
}
