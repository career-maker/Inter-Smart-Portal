// Host of the API (e.g. workplace.intersmart.in). When the site is served from it or a subdomain
// (www.workplace.intersmart.in) the cookie is shared with the API, so file links need no ?token=.
export function sharedCookieDomain(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const apiHost = new URL(process.env.NEXT_PUBLIC_API_URL || '').hostname;
    const h = window.location.hostname;
    return apiHost && (h === apiHost || h.endsWith('.' + apiHost)) ? apiHost : null;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string, days = 30) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  const isSecure = window.location.protocol === 'https:';
  const domain = sharedCookieDomain();
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${domain ? `; domain=${domain}` : ''}${isSecure ? '; secure' : ''}`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  const expired = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; secure' : ''}`;
  document.cookie = expired;
  const domain = sharedCookieDomain();
  if (domain) document.cookie = `${expired}; domain=${domain}`;
}
