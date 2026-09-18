import { useState } from "react";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  NavLink,
  Pagination,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconBookmarkFilled,
  IconLogout,
  IconPlus,
  IconSearch,
  IconStarFilled,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import BookmarkCard from "../components/BookmarkCard";
import BookmarkFormModal from "../components/BookmarkFormModal";
import { useAuth } from "../hooks/useAuth";
import {
  useBookmarks,
  useCreateBookmark,
  useDeleteBookmark,
  useDeleteTag,
  useTags,
  useToggleFavorite,
  useUpdateBookmark,
} from "../hooks/useBookmarks";
import type { Bookmark, BookmarkInput } from "../api/types";

export default function BoardPage() {
  const { user, logout } = useAuth();
  const [navOpened, { toggle: toggleNav, close: closeNav }] =
    useDisclosure(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [editing, setEditing] = useState<Bookmark | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [tag, setTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState<"recent" | "oldest" | "title">("recent");
  const [page, setPage] = useState(1);

  const filters = {
    q: debouncedSearch.trim() || undefined,
    tag: tag ?? undefined,
    favorite: onlyFavorites,
    sort,
    page,
  };

  const bookmarks = useBookmarks(filters);
  const tags = useTags();
  const createBookmark = useCreateBookmark();
  const updateBookmark = useUpdateBookmark();
  const toggleFavorite = useToggleFavorite();
  const deleteBookmark = useDeleteBookmark();
  const deleteTag = useDeleteTag();

  const resetPage = () => setPage(1);

  const handleNew = () => {
    setEditing(null);
    openModal();
  };

  const handleEdit = (bookmark: Bookmark) => {
    setEditing(bookmark);
    openModal();
  };

  const handleSubmit = (values: BookmarkInput) => {
    if (editing) {
      updateBookmark.mutate(
        { id: editing.id, ...values },
        { onSuccess: closeModal },
      );
    } else {
      createBookmark.mutate(values, { onSuccess: closeModal });
    }
  };

  const confirmDelete = (bookmark: Bookmark) =>
    modals.openConfirmModal({
      title: "Eliminar marcador",
      centered: true,
      children: (
        <Text size="sm">Se quitará «{bookmark.title}» de tu tablero.</Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Conservar" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteBookmark.mutate(bookmark.id),
    });

  const confirmDeleteTag = (id: string, name: string) =>
    modals.openConfirmModal({
      title: "Eliminar etiqueta",
      centered: true,
      children: (
        <Text size="sm">
          Se elimina «{name}» de todos los marcadores. Los enlaces se conservan.
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Conservar" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        if (tag === name) setTag(null);
        deleteTag.mutate(id);
      },
    });

  const selectTag = (name: string | null) => {
    setTag(name);
    resetPage();
    closeNav();
  };

  const items = bookmarks.data?.items ?? [];
  const pages = bookmarks.data?.pages ?? 1;
  const hasFilters = Boolean(filters.q || tag || onlyFavorites);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !navOpened },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="md" wrap="nowrap">
          <Burger
            opened={navOpened}
            onClick={toggleNav}
            hiddenFrom="sm"
            size="sm"
          />
          <Group gap={8} wrap="nowrap" visibleFrom="xs">
            <IconBookmarkFilled size={18} color="var(--mantine-color-ink-6)" />
            <Text fw={600}>Marcadores</Text>
          </Group>

          <TextInput
            flex={1}
            maw={420}
            placeholder="Buscar por título, nota o enlace"
            leftSection={<IconSearch size={16} />}
            rightSection={
              search ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
          />

          <Group gap="xs" ml="auto" wrap="nowrap">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleNew}
              visibleFrom="sm"
            >
              Nuevo marcador
            </Button>
            <ActionIcon
              size="lg"
              onClick={handleNew}
              hiddenFrom="sm"
              aria-label="Nuevo marcador"
            >
              <IconPlus size={18} />
            </ActionIcon>

            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <UnstyledButton aria-label="Tu cuenta">
                  <Avatar src={user?.avatarUrl} radius="xl" size={32}>
                    {user?.name?.[0] ?? user?.email[0]}
                  </Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.email}</Menu.Label>
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  onClick={logout}
                >
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap={4}>
          <NavLink
            label="Todos"
            active={!tag && !onlyFavorites}
            onClick={() => {
              setOnlyFavorites(false);
              selectTag(null);
            }}
          />
          <NavLink
            label="Destacados"
            leftSection={<IconStarFilled size={14} />}
            active={onlyFavorites}
            onClick={() => {
              setOnlyFavorites(true);
              selectTag(null);
            }}
          />
        </Stack>

        <Text size="xs" c="dimmed" mt="lg" mb={6}>
          Etiquetas
        </Text>

        <ScrollArea.Autosize mah="calc(100vh - 220px)">
          <Stack gap={2}>
            {tags.data?.length === 0 && (
              <Text size="sm" c="dimmed">
                Aún no tienes etiquetas. Se crean solas al guardar un marcador.
              </Text>
            )}
            {tags.data?.map((t) => (
              <NavLink
                key={t.id}
                label={t.name}
                active={tag === t.name}
                onClick={() => {
                  setOnlyFavorites(false);
                  selectTag(t.name);
                }}
                leftSection={
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                }
                rightSection={
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {t.bookmarkCount}
                    </Text>
                    <ActionIcon
                      component="span"
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Eliminar etiqueta ${t.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteTag(t.id, t.name);
                      }}
                    >
                      <IconTrash size={13} />
                    </ActionIcon>
                  </Group>
                }
              />
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </AppShell.Navbar>

      <AppShell.Main className="board-surface">
        <Group justify="space-between" align="flex-end" mb="lg">
          <div>
            <Title order={2}>
              {onlyFavorites ? "Destacados" : tag ? `#${tag}` : "Tu tablero"}
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              {bookmarks.data
                ? `${bookmarks.data.total} ${bookmarks.data.total === 1 ? "marcador" : "marcadores"}`
                : " "}
            </Text>
          </div>

          <Select
            w={170}
            aria-label="Orden"
            value={sort}
            onChange={(value) => {
              setSort((value as typeof sort) ?? "recent");
              resetPage();
            }}
            data={[
              { value: "recent", label: "Más recientes" },
              { value: "oldest", label: "Más antiguos" },
              { value: "title", label: "Por título" },
            ]}
          />
        </Group>

        {bookmarks.isLoading ? (
          <Center py="xl">
            <Loader type="dots" />
          </Center>
        ) : items.length === 0 ? (
          <Center py={80}>
            <Stack align="center" gap="sm" maw={360} ta="center">
              <Title order={3}>
                {hasFilters
                  ? "Nada coincide con este filtro"
                  : "Empieza por el primer enlace"}
              </Title>
              <Text c="dimmed" size="sm">
                {hasFilters
                  ? "Prueba con otra palabra o quita los filtros activos."
                  : "Pega una URL, ponle un título y una etiqueta. Eso es todo."}
              </Text>
              {hasFilters ? (
                <Button
                  variant="light"
                  onClick={() => {
                    setSearch("");
                    setOnlyFavorites(false);
                    selectTag(null);
                  }}
                >
                  Quitar filtros
                </Button>
              ) : (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleNew}
                >
                  Guardar un marcador
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {items.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onEdit={handleEdit}
                  onDelete={confirmDelete}
                  onToggleFavorite={(b) =>
                    toggleFavorite.mutate({ id: b.id, favorite: !b.favorite })
                  }
                  onSelectTag={(name) => {
                    setOnlyFavorites(false);
                    selectTag(name);
                  }}
                />
              ))}
            </SimpleGrid>

            {pages > 1 && (
              <Group justify="center" mt="xl">
                <Pagination total={pages} value={page} onChange={setPage} />
              </Group>
            )}
          </>
        )}
      </AppShell.Main>

      <BookmarkFormModal
        opened={modalOpened}
        bookmark={editing}
        tags={tags.data ?? []}
        saving={createBookmark.isPending || updateBookmark.isPending}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </AppShell>
  );
}
