export function setAuthCookie(token: string, days = 30) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; secure' : ''}`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; secure' : ''}`;
}
