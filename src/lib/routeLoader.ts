import { lazy, type ComponentType } from "react";

type RouteModule = { default: ComponentType<any> };
type RouteLoader = () => Promise<RouteModule>;

const CHUNK_RELOAD_KEY = "__estate_ai_chunk_reload_at__";
const RELOAD_GUARD_MS = 10_000;

export const routeLoaders = {
  forgotPassword: () => import("../pages/ForgotPassword"),
  onboarding: () => import("../pages/Onboarding"),
  dashboard: () => import("../pages/Dashboard"),
  chasseur: () => import("../pages/Chasseur"),
  copilote: () => import("../pages/Copilote"),
  studio: () => import("../pages/Documents"),
  estimation: () => import("../pages/EstimationIA"),
  settings: () => import("../pages/Settings"),
  sauvegardes: () => import("../pages/Sauvegardes"),
  mentionsLegales: () => import("../pages/MentionsLegales"),
  politiqueConfidentialite: () => import("../pages/PolitiqueConfidentialite"),
  cgu: () => import("../pages/CGU"),
  faq: () => import("../pages/FAQ"),
  notFound: () => import("../pages/NotFound"),
} satisfies Record<string, RouteLoader>;

export const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk \d+ failed|vite:preloadError/i.test(
    message
  );
};

export const recoverFromChunkLoadError = (error?: unknown) => {
  if (error && !isChunkLoadError(error)) return false;
  if (typeof window === "undefined") return false;

  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  const canReload = !lastReloadAt || Date.now() - lastReloadAt > RELOAD_GUARD_MS;

  if (!canReload) return false;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
};

export const resetChunkReloadGuard = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }
};

export const lazyWithRetry = (factory: RouteLoader) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        return await factory();
      } catch (retryError) {
        recoverFromChunkLoadError(retryError);
        throw retryError;
      }
    }
  });

const preloadedRoutes = new Set<keyof typeof routeLoaders>();

export const preloadRoute = Object.fromEntries(
  Object.entries(routeLoaders).map(([key, loader]) => [
    key,
    () => {
      const routeKey = key as keyof typeof routeLoaders;
      if (preloadedRoutes.has(routeKey)) return;

      preloadedRoutes.add(routeKey);
      loader().catch((error) => {
        preloadedRoutes.delete(routeKey);
        recoverFromChunkLoadError(error);
      });
    },
  ])
) as Record<keyof typeof routeLoaders, () => void>;