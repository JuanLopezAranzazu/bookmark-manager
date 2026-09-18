import type { FastifyInstance, FastifyRequest } from 'fastify';
import oauth2, { type OAuth2Namespace } from '@fastify/oauth2';
import { Provider } from '@prisma/client';
import { env, providersEnabled } from '../env.js';
import { prisma } from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2?: OAuth2Namespace;
    githubOAuth2?: OAuth2Namespace;
  }
}

type Profile = {
  providerAccountId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

async function getGoogleProfile(accessToken: string): Promise<Profile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('No se pudo leer el perfil de Google');

  const data = (await res.json()) as {
    id: string;
    email?: string;
    verified_email?: boolean;
    name?: string;
    picture?: string;
  };

  if (!data.email) throw new Error('La cuenta de Google no expone un email');
  if (data.verified_email === false) throw new Error('El email de Google no esta verificado');

  return {
    providerAccountId: data.id,
    email: data.email.toLowerCase(),
    name: data.name ?? null,
    avatarUrl: data.picture ?? null,
  };
}

async function getGithubProfile(accessToken: string): Promise<Profile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'bookmark-manager',
  };

  const res = await fetch('https://api.github.com/user', { headers });
  if (!res.ok) throw new Error('No se pudo leer el perfil de GitHub');

  const data = (await res.json()) as {
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };

  let email = data.email;

  // El email publico puede ser null: se consulta la lista privada.
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      email = emails.find((e) => e.primary && e.verified)?.email
        ?? emails.find((e) => e.verified)?.email
        ?? null;
    }
  }

  if (!email) throw new Error('No se encontro un email verificado en GitHub');

  return {
    providerAccountId: String(data.id),
    email: email.toLowerCase(),
    name: data.name ?? data.login,
    avatarUrl: data.avatar_url ?? null,
  };
}

/**
 * Busca la cuenta del proveedor. Si no existe, vincula al usuario con ese
 * email o crea uno nuevo. Asi una misma persona puede entrar con Google y
 * con GitHub y llegar a los mismos bookmarks.
 */
async function upsertUserFromProfile(provider: Provider, profile: Profile) {
  const existing = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.userId },
      data: {
        name: existing.user.name ?? profile.name,
        avatarUrl: profile.avatarUrl ?? existing.user.avatarUrl,
      },
    });
  }

  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
    },
    create: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
  });

  await prisma.account.create({
    data: {
      provider,
      providerAccountId: profile.providerAccountId,
      userId: user.id,
    },
  });

  return user;
}

export default async function authRoutes(app: FastifyInstance) {
  if (providersEnabled.google) {
    await app.register(oauth2, {
      name: 'googleOAuth2',
      scope: ['openid', 'email', 'profile'],
      credentials: {
        client: { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET },
        auth: oauth2.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: '/auth/google',
      callbackUri: `${env.API_URL}/api/auth/google/callback`,
    });
  }

  if (providersEnabled.github) {
    await app.register(oauth2, {
      name: 'githubOAuth2',
      scope: ['read:user', 'user:email'],
      credentials: {
        client: { id: env.GITHUB_CLIENT_ID, secret: env.GITHUB_CLIENT_SECRET },
        auth: oauth2.GITHUB_CONFIGURATION,
      },
      startRedirectPath: '/auth/github',
      callbackUri: `${env.API_URL}/api/auth/github/callback`,
    });
  }

  app.get('/auth/providers', async () => providersEnabled);

  const handleCallback = async (
    request: FastifyRequest,
    reply: import('fastify').FastifyReply,
    provider: Provider,
  ) => {
    const namespace = provider === Provider.GOOGLE ? app.googleOAuth2 : app.githubOAuth2;
    if (!namespace) return reply.redirect(`${env.WEB_URL}/login?error=provider_disabled`);

    try {
      const { token } = await namespace.getAccessTokenFromAuthorizationCodeFlow(request);
      const profile = provider === Provider.GOOGLE
        ? await getGoogleProfile(token.access_token)
        : await getGithubProfile(token.access_token);

      const user = await upsertUserFromProfile(provider, profile);
      app.issueSession(reply, user.id);
      return reply.redirect(env.WEB_URL);
    } catch (err) {
      request.log.error({ err }, 'Fallo el login OAuth');
      return reply.redirect(`${env.WEB_URL}/login?error=oauth_failed`);
    }
  };

  if (providersEnabled.google) {
    app.get('/auth/google/callback', (req, reply) => handleCallback(req, reply, Provider.GOOGLE));
  }

  if (providersEnabled.github) {
    app.get('/auth/github/callback', (req, reply) => handleCallback(req, reply, Provider.GITHUB));
  }

  app.get('/auth/me', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      app.clearSession(reply);
      return reply.code(401).send({ error: 'No autenticado' });
    }
    return user;
  });

  app.post('/auth/logout', async (_request, reply) => {
    app.clearSession(reply);
    return { ok: true };
  });
}
