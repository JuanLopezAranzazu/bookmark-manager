import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { conflict, notFound } from '../lib/errors.js';
import { randomTagColor } from '../lib/colors.js';

const listQuery = z.object({
  q: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  favorite: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  sort: z.enum(['recent', 'oldest', 'title']).default('recent'),
});

const tagNames = z
  .array(z.string().trim().min(1).max(32))
  .max(20)
  .optional()
  .transform((names) => (names ? [...new Set(names.map((n) => n.toLowerCase()))] : undefined));

const createBody = z.object({
  url: z.string().trim().url('La URL no es valida'),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullish(),
  favorite: z.boolean().optional(),
  tags: tagNames,
});

const updateBody = createBody.partial();

const bookmarkSelect = {
  id: true,
  url: true,
  title: true,
  description: true,
  faviconUrl: true,
  favorite: true,
  createdAt: true,
  updatedAt: true,
  tags: { select: { id: true, name: true, color: true } },
} satisfies Prisma.BookmarkSelect;

function faviconFor(url: string) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return null;
  }
}

function tagsConnectOrCreate(userId: string, names: string[]) {
  return names.map((name) => ({
    where: { userId_name: { userId, name } },
    create: { name, userId, color: randomTagColor(name) },
  }));
}

export default async function bookmarkRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.get('/bookmarks', async (request) => {
    const { q, tag, favorite, page, pageSize, sort } = listQuery.parse(request.query);
    const userId = request.userId;

    const where: Prisma.BookmarkWhereInput = {
      userId,
      ...(favorite ? { favorite: favorite === 'true' } : {}),
      ...(tag ? { tags: { some: { name: tag.toLowerCase(), userId } } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { url: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.BookmarkOrderByWithRelationInput =
      sort === 'title' ? { title: 'asc' } : { createdAt: sort === 'oldest' ? 'asc' : 'desc' };

    const [items, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: bookmarkSelect,
      }),
      prisma.bookmark.count({ where }),
    ]);

    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) || 1 };
  });

  app.post('/bookmarks', async (request, reply) => {
    const body = createBody.parse(request.body);
    const userId = request.userId;

    const duplicate = await prisma.bookmark.findUnique({
      where: { userId_url: { userId, url: body.url } },
      select: { id: true },
    });
    if (duplicate) throw conflict('Ese enlace ya esta guardado');

    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        url: body.url,
        title: body.title,
        description: body.description ?? null,
        favorite: body.favorite ?? false,
        faviconUrl: faviconFor(body.url),
        ...(body.tags?.length ? { tags: { connectOrCreate: tagsConnectOrCreate(userId, body.tags) } } : {}),
      },
      select: bookmarkSelect,
    });

    return reply.code(201).send(bookmark);
  });

  app.get('/bookmarks/:id', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const bookmark = await prisma.bookmark.findFirst({
      where: { id, userId: request.userId },
      select: bookmarkSelect,
    });
    if (!bookmark) throw notFound('Bookmark');
    return bookmark;
  });

  app.patch('/bookmarks/:id', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateBody.parse(request.body);
    const userId = request.userId;

    const current = await prisma.bookmark.findFirst({ where: { id, userId }, select: { id: true } });
    if (!current) throw notFound('Bookmark');

    return prisma.bookmark.update({
      where: { id },
      data: {
        ...(body.url ? { url: body.url, faviconUrl: faviconFor(body.url) } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.favorite !== undefined ? { favorite: body.favorite } : {}),
        ...(body.tags
          ? { tags: { set: [], connectOrCreate: tagsConnectOrCreate(userId, body.tags) } }
          : {}),
      },
      select: bookmarkSelect,
    });
  });

  app.delete('/bookmarks/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const deleted = await prisma.bookmark.deleteMany({ where: { id, userId: request.userId } });
    if (deleted.count === 0) throw notFound('Bookmark');
    return reply.code(204).send();
  });
}
