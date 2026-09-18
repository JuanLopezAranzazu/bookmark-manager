export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  bookmarkCount?: number;
};

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Pick<Tag, 'id' | 'name' | 'color'>[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export type BookmarkInput = {
  url: string;
  title: string;
  description?: string | null;
  favorite?: boolean;
  tags?: string[];
};

export type BookmarkFilters = {
  q?: string;
  tag?: string;
  favorite?: boolean;
  sort?: 'recent' | 'oldest' | 'title';
  page?: number;
};

export type Providers = { google: boolean; github: boolean };
