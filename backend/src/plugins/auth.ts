import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env, SESSION_COOKIE } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    issueSession: (reply: FastifyReply, userId: string) => void;
    clearSession: (reply: FastifyReply) => void;
  }
  interface FastifyRequest {
    userId: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export default fp(async (app) => {
  await app.register(cookie, { secret: env.COOKIE_SECRET });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: '7d' },
  });

  app.decorateRequest('userId', '');

  app.decorate('issueSession', (reply: FastifyReply, userId: string) => {
    const token = app.jwt.sign({ sub: userId });
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: SEVEN_DAYS,
    });
  });

  app.decorate('clearSession', (reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
  });

  app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify();
      request.userId = payload.sub;
    } catch {
      reply.code(401).send({ error: 'No autenticado' });
    }
  });
});
