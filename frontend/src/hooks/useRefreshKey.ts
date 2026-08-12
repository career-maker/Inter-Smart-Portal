import { useSearchParams } from "next/navigation";

/**
 * Returns a stable "refresh key" derived from the `?refresh=` query param.
 * List pages add this to their useEffect dependency array — when a form
 * navigates back with `?refresh=<timestamp>`, the key changes and the page
 * re-fetches automatically without needing a full browser reload.
 */
export function useRefreshKey(): string {
  const params = useSearchParams();
  return params.get("refresh") ?? "";
}
