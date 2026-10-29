import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { setAuthCookie, sharedCookieDomain } from "@/lib/authCookies"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStorageUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  // Same-site deployment: the shared cookie carries the login, so the token stays out of the URL.
  let query = '';
  if (token) {
    if (sharedCookieDomain()) setAuthCookie(token);
    else query = `?token=${encodeURIComponent(token)}`;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/storage/${cleanPath}${query}`;
}
