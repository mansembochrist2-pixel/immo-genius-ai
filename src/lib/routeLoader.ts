import { lazy, type ComponentType } from "react";

type RouteModule = { default: ComponentType };
type RouteLoader = () => Promise<RouteModule>;

export const routeLoaders = {
  forgotPassword: () => import("../pages/ForgotPassword"),
  onboarding: () => import("../pages/Onboarding"),
  dashboard: () => import("../pages/Dashboard"),
  chasseur: () => import("../pages/Chasseur"),
  copilote: () => import("../pages/Copilote"),
  studio: () => import("../pages/Documents"),
  estimation: () => import("../pages/EstimationIA"),
  expertise: () => import("../pages/Expertise"),
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

// Backwards-compat no-op exports (former auto-reload helpers removed —
// they caused full page refreshes that wiped sessionStorage and produced a
// visible "flash" when switching modules).
export const recoverFromChunkLoadError = (_error?: unknown) => false;
export const resetChunkReloadGuard = () => {};

const loadOnce = async (factory: RouteLoader): Promise<RouteModule> => {
  const mod = await factory();
  if (!mod || typeof (mod as any).default !== "function") {
    throw new Error("Failed to fetch dynamically imported module: missing default export");
  }
  return mod;
};

export const lazyWithRetry = (factory: RouteLoader) =>
  lazy(async () => {
    try {
      return await loadOnce(factory);
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return await loadOnce(factory);
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
      loader().catch(() => {
        preloadedRoutes.delete(routeKey);
      });
    },
  ])
) as Record<keyof typeof routeLoaders, () => void>;

/**
 * Preload every app route in the background after first paint, so navigating
 * between modules feels instant (no Suspense flash). Called once from App.tsx.
 */
export const preloadAllRoutes = () => {
  if (typeof window === "undefined") return;
  const run = () => Object.values(preloadRoute).forEach((p) => p());
  // Defer to idle so it never competes with the first render
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 800);
  }
};
