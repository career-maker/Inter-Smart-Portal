import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStorageUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/storage/${cleanPath}${query}`;
}
