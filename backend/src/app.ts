import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import { HttpError } from './lib/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' }, level: 'info' }
      : true,
  });

  await app.register(cors, { origin: env.WEB_URL, credentials: true });
  await app.register(authPlugin);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Datos invalidos',
        details: error.flatten().fieldErrors,
      });
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    request.log.error({ err: error }, 'Error no controlado');
    const status = error.statusCode ?? 500;
    return reply.code(status).send({
      error: status < 500 ? error.message : 'Error interno del servidor',
    });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(async (api) => {
    await api.register(authRoutes);
  }, { prefix: '/api' });

  return app;
}
