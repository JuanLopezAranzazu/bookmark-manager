import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBrandGithubFilled,
  IconBrandGoogleFilled,
  IconBookmarkFilled,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { api, startOAuth } from "../api/client";
import type { Providers } from "../api/types";

const ERRORS: Record<string, string> = {
  oauth_failed:
    "El proveedor rechazo el acceso o no devolvio un email verificado. Intenta de nuevo.",
  provider_disabled: "Ese proveedor no esta configurado en el servidor.",
};

const SAMPLE_TAGS = [
  "lectura",
  "diseño",
  "typescript",
  "recetas",
  "infra",
  "música",
];

export default function LoginPage() {
  const [params, setParams] = useSearchParams();
  const error = params.get("error");

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.get<Providers>("/auth/providers"),
  });

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setParams({}, { replace: true }), 8000);
    return () => clearTimeout(timer);
  }, [error, setParams]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <Box
        className="hidden lg:flex flex-col justify-between p-12"
        style={{
          backgroundColor: "var(--mantine-color-ink-9)",
          color: "white",
        }}
      >
        <Group gap={8}>
          <IconBookmarkFilled size={20} />
          <Text fw={600}>Marcadores</Text>
        </Group>

        <div className="max-w-[26rem]">
          <Title
            order={1}
            c="white"
            style={{ fontSize: "3rem", lineHeight: 1.05 }}
          >
            Las pestañas que nunca cierras, ordenadas.
          </Title>
          <Text mt="lg" c="ink.2" style={{ lineHeight: 1.6 }}>
            Guarda un enlace, ponle una etiqueta y encuéntralo meses después
            escribiendo dos palabras.
          </Text>

          <div className="mt-10 flex flex-wrap gap-2">
            {SAMPLE_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-sm"
                style={{ backgroundColor: "rgba(255,255,255,.12)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <Text size="sm" c="ink.3">
          Tus marcadores son privados: solo los ve la cuenta con la que entras.
        </Text>
      </Box>

      <div className="flex items-center justify-center p-6">
        <Stack w="100%" maw={360} gap="lg">
          <div>
            <Title order={2}>Entra a tu tablero</Title>
            <Text c="dimmed" mt={6}>
              Usa la cuenta que ya tienes. No hay contraseñas que recordar.
            </Text>
          </div>

          {error && (
            <Alert color="red" variant="light" title="No se pudo entrar">
              {ERRORS[error] ?? "Algo falló durante el inicio de sesión."}
            </Alert>
          )}

          <Stack gap="sm">
            <Button
              size="md"
              variant="default"
              leftSection={<IconBrandGoogleFilled size={18} />}
              disabled={providers ? !providers.google : false}
              onClick={() => startOAuth("google")}
            >
              Continuar con Google
            </Button>
            <Button
              size="md"
              color="dark"
              leftSection={<IconBrandGithubFilled size={18} />}
              disabled={providers ? !providers.github : false}
              onClick={() => startOAuth("github")}
            >
              Continuar con GitHub
            </Button>
          </Stack>

          <Divider />

          <Text size="xs" c="dimmed">
            Si entras con Google y con GitHub usando el mismo correo, llegas al
            mismo tablero.
          </Text>
        </Stack>
      </div>
    </div>
  );
}
