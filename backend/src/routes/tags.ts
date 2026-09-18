import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { conflict, notFound } from '../lib/errors.js';
import { randomTagColor } from '../lib/colors.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser hexadecimal, ej: #4F46E5');

const createTag = z.object({
  name: z.string().trim().min(1).max(32).transform((v) => v.toLowerCase()),
  color: hexColor.optional(),
});

const updateTag = z.object({
  name: z.string().trim().min(1).max(32).transform((v) => v.toLowerCase()).optional(),
  color: hexColor.optional(),
});

export default async function tagRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.get('/tags', async (request) => {
    const tags = await prisma.tag.findMany({
      where: { userId: request.userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { bookmarks: true } },
      },
    });

    return tags.map(({ _count, ...tag }) => ({ ...tag, bookmarkCount: _count.bookmarks }));
  });

  app.post('/tags', async (request, reply) => {
    const body = createTag.parse(request.body);
    const existing = await prisma.tag.findUnique({
      where: { userId_name: { userId: request.userId, name: body.name } },
      select: { id: true },
    });
    if (existing) throw conflict('Ya existe una etiqueta con ese nombre');

    const tag = await prisma.tag.create({
      data: {
        name: body.name,
        color: body.color ?? randomTagColor(body.name),
        userId: request.userId,
      },
      select: { id: true, name: true, color: true },
    });

    return reply.code(201).send({ ...tag, bookmarkCount: 0 });
  });

  app.patch('/tags/:id', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateTag.parse(request.body);

    const current = await prisma.tag.findFirst({
      where: { id, userId: request.userId },
      select: { id: true },
    });
    if (!current) throw notFound('Etiqueta');

    return prisma.tag.update({
      where: { id },
      data: body,
      select: { id: true, name: true, color: true },
    });
  });

  app.delete('/tags/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const deleted = await prisma.tag.deleteMany({ where: { id, userId: request.userId } });
    if (deleted.count === 0) throw notFound('Etiqueta');
    return reply.code(204).send();
  });
}
