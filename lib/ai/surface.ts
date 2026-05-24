export type Surface = "main" | "businesses";

export type GreetingKey =
  | "default"
  | "opportunities"
  | "services"
  | "contact"
  | "businesses"
  | "businesses-listings";

export interface SurfaceResolution {
  surface: Surface;
  page: GreetingKey;
}

/** Map a pathname to the chat surface (KB scope + prompt variant) and greeting key. */
export function resolveSurface(pathname: string): SurfaceResolution {
  const path = pathname || "/";
  if (path.startsWith("/businesses/listing")) {
    return { surface: "businesses", page: "businesses-listings" };
  }
  if (path.startsWith("/businesses")) {
    return { surface: "businesses", page: "businesses" };
  }
  if (path.startsWith("/opportunities")) return { surface: "main", page: "opportunities" };
  if (path.startsWith("/services")) return { surface: "main", page: "services" };
  if (path.startsWith("/contact")) return { surface: "main", page: "contact" };
  return { surface: "main", page: "default" };
}
