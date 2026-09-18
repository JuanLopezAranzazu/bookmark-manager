import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconDots,
  IconExternalLink,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import type { Bookmark } from "../api/types";

type Props = {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (bookmark: Bookmark) => void;
  onSelectTag: (tag: string) => void;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSelectTag,
}: Props) {
  return (
    <Card withBorder padding="md" radius="md" className="flex h-full flex-col">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="xs" wrap="nowrap" className="min-w-0">
          {bookmark.faviconUrl && (
            <img
              src={bookmark.faviconUrl}
              alt=""
              width={18}
              height={18}
              className="shrink-0 rounded-sm"
              loading="lazy"
            />
          )}
          <Text size="xs" c="dimmed" truncate>
            {hostOf(bookmark.url)}
          </Text>
        </Group>

        <Group gap={4} wrap="nowrap">
          <Tooltip
            label={bookmark.favorite ? "Quitar de destacados" : "Destacar"}
          >
            <ActionIcon
              variant="subtle"
              color={bookmark.favorite ? "yellow" : "gray"}
              onClick={() => onToggleFavorite(bookmark)}
              aria-label="Destacar marcador"
            >
              {bookmark.favorite ? (
                <IconStarFilled size={16} />
              ) : (
                <IconStar size={16} />
              )}
            </ActionIcon>
          </Tooltip>

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Más acciones"
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconExternalLink size={14} />}
                component="a"
                href={bookmark.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Abrir enlace
              </Menu.Item>
              <Menu.Item
                leftSection={<IconPencil size={14} />}
                onClick={() => onEdit(bookmark)}
              >
                Editar
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => onDelete(bookmark)}
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Text
        component="a"
        href={bookmark.url}
        target="_blank"
        rel="noreferrer noopener"
        fw={600}
        mt="sm"
        lineClamp={2}
        className="hover:underline"
      >
        {bookmark.title}
      </Text>

      {bookmark.description && (
        <Text size="sm" c="dimmed" mt={6} lineClamp={3}>
          {bookmark.description}
        </Text>
      )}

      {bookmark.tags.length > 0 && (
        <Group gap={6} mt="auto" pt="md">
          {bookmark.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="light"
              radius="sm"
              style={{
                backgroundColor: `${tag.color}1a`,
                color: tag.color,
                cursor: "pointer",
              }}
              onClick={() => onSelectTag(tag.name)}
            >
              {tag.name}
            </Badge>
          ))}
        </Group>
      )}
    </Card>
  );
}
