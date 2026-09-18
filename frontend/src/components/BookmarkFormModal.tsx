import { useEffect } from "react";
import {
  Button,
  Group,
  Modal,
  Stack,
  TagsInput,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Bookmark, BookmarkInput, Tag } from "../api/types";

type Props = {
  opened: boolean;
  bookmark: Bookmark | null;
  tags: Tag[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: BookmarkInput) => void;
};

type FormValues = {
  url: string;
  title: string;
  description: string;
  tags: string[];
};

export default function BookmarkFormModal({
  opened,
  bookmark,
  tags,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const form = useForm<FormValues>({
    initialValues: { url: "", title: "", description: "", tags: [] },
    validate: {
      url: (value) => {
        try {
          new URL(value);
          return null;
        } catch {
          return "Escribe una URL completa, con https://";
        }
      },
      title: (value) => (value.trim().length === 0 ? "Ponle un título" : null),
    },
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues({
      url: bookmark?.url ?? "",
      title: bookmark?.title ?? "",
      description: bookmark?.description ?? "",
      tags: bookmark?.tags.map((t) => t.name) ?? [],
    });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, bookmark]);

  const handleSubmit = form.onSubmit((values) => {
    onSubmit({
      url: values.url.trim(),
      title: values.title.trim(),
      description: values.description.trim() || null,
      tags: values.tags,
    });
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={bookmark ? "Editar marcador" : "Nuevo marcador"}
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Enlace"
            placeholder="https://..."
            withAsterisk
            data-autofocus
            {...form.getInputProps("url")}
          />
          <TextInput
            label="Título"
            placeholder="Cómo se llama para ti"
            withAsterisk
            {...form.getInputProps("title")}
          />
          <Textarea
            label="Nota"
            placeholder="Por qué lo guardaste"
            autosize
            minRows={2}
            maxRows={5}
            {...form.getInputProps("description")}
          />
          <TagsInput
            label="Etiquetas"
            placeholder="Escribe y pulsa Enter"
            data={tags.map((t) => t.name)}
            maxTags={20}
            clearable
            {...form.getInputProps("tags")}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {bookmark ? "Guardar cambios" : "Guardar marcador"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
