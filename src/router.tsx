import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { App } from "./App";
import { Home } from "./pages/Home";
import { PrivateTelegramGallery } from "./pages/PrivateTelegramGallery";

const rootRoute = createRootRoute({
  component: App,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gallery",
  component: PrivateTelegramGallery,
});

const routeTree = rootRoute.addChildren([homeRoute, aboutRoute]);

export const router = createRouter({ routeTree });

// Register your router for maximum type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
