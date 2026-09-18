import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { api } from '../api/client';
import type { Bookmark, BookmarkFilters, BookmarkInput, Paginated, Tag } from '../api/types';

function toQueryString(filters: BookmarkFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.favorite) params.set('favorite', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useBookmarks(filters: BookmarkFilters) {
  return useQuery({
    queryKey: ['bookmarks', filters],
    queryFn: () => api.get<Paginated<Bookmark>>(`/bookmarks${toQueryString(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<Tag[]>('/tags'),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    void queryClient.invalidateQueries({ queryKey: ['tags'] });
  };
}

const fail = (message: string) =>
  notifications.show({ color: 'red', title: 'No se guardo', message });

export function useCreateBookmark() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: BookmarkInput) => api.post<Bookmark>('/bookmarks', input),
    onSuccess: (bookmark) => {
      invalidate();
      notifications.show({ title: 'Guardado', message: bookmark.title });
    },
    onError: (err: Error) => fail(err.message),
  });
}

export function useUpdateBookmark() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: BookmarkInput & { id: string }) =>
      api.patch<Bookmark>(`/bookmarks/${id}`, input),
    onSuccess: () => {
      invalidate();
      notifications.show({ title: 'Actualizado', message: 'Los cambios estan guardados' });
    },
    onError: (err: Error) => fail(err.message),
  });
}

export function useToggleFavorite() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.patch<Bookmark>(`/bookmarks/${id}`, { favorite }),
    onSuccess: invalidate,
    onError: (err: Error) => fail(err.message),
  });
}

export function useDeleteBookmark() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.del(`/bookmarks/${id}`),
    onSuccess: () => {
      invalidate();
      notifications.show({ title: 'Eliminado', message: 'El marcador ya no esta en tu tablero' });
    },
    onError: (err: Error) => fail(err.message),
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.del(`/tags/${id}`),
    onSuccess: invalidate,
    onError: (err: Error) => fail(err.message),
  });
}
