/**
 * Friendly Error Message Sanitizer
 * Transforms technical, raw server, or database error strings into clear, human-friendly messages.
 */

export function formatFriendlyErrorMessage(
  error: any,
  fallback: string = "An unexpected error occurred. Please try again."
): string {
  if (!error) return fallback;

  // 1. Check HTTP status code if available
  const status = error.response?.status || error.status;
  if (status === 413) {
    return "The uploaded file or image is too large. Please select a smaller file (recommended under 5MB) and try again.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested information could not be found. Please refresh and try again.";
  }
  if (status === 429) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  if (status >= 500) {
    // Check if there's a specific friendly message from server
    const serverMsg = error.response?.data?.message;
    if (serverMsg && typeof serverMsg === "string" && isSafeUserMessage(serverMsg)) {
      return serverMsg;
    }
    return "We are experiencing a temporary server problem. Please try again in a few moments.";
  }

  // 2. Extract raw message text
  let raw = "";
  if (typeof error === "string") {
    raw = error;
  } else if (typeof error.response?.data === "string") {
    raw = error.response.data;
  } else if (error.response?.data?.message && typeof error.response.data.message === "string") {
    raw = error.response.data.message;
  } else if (error.response?.data?.error && typeof error.response.data.error === "string") {
    raw = error.response.data.error;
  } else if (error.message && typeof error.message === "string") {
    raw = error.message;
  }

  if (!raw) return fallback;

  // If response contains raw HTML (e.g. 500 error page from server / cPanel)
  if (raw.trim().startsWith("<!DOCTYPE") || raw.includes("<html") || raw.includes("<body")) {
    return "Unable to complete request due to a server issue. Please try again.";
  }

  const lower = raw.toLowerCase();

  // 3. Technical pattern matching to replace with clean human-friendly messages
  if (
    lower.includes("post data is too large") ||
    lower.includes("payload too large") ||
    lower.includes("request entity too large") ||
    lower.includes("max_file_size") ||
    lower.includes("post_max_size") ||
    lower.includes("upload_max_filesize")
  ) {
    return "The uploaded file or image is too large. Please select a smaller file (recommended under 5MB) and try again.";
  }

  if (
    lower.includes("sqlstate") ||
    lower.includes("unknown column") ||
    lower.includes("syntax error") ||
    lower.includes("integrity constraint") ||
    lower.includes("foreign key") ||
    lower.includes("table or view not found") ||
    lower.includes("database query error")
  ) {
    return "Unable to save due to a system database error. Our technical team has been notified.";
  }

  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("err_connection") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("load failed")
  ) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  if (
    lower.includes("csrf token mismatch") ||
    lower.includes("page expired") ||
    lower.includes("token mismatch")
  ) {
    return "Your session has expired. Please refresh the page and try again.";
  }

  if (
    lower.includes("unauthenticated") ||
    lower.includes("unauthorized") ||
    lower.includes("token has expired")
  ) {
    return "Your session has expired. Please sign in again.";
  }

  if (
    lower.includes("call to a member function") ||
    lower.includes("fatal error") ||
    lower.includes("uncaught exception") ||
    lower.includes("stack trace") ||
    lower.includes("vendor/laravel")
  ) {
    return "A temporary server issue occurred. Please try again.";
  }

  // 4. If Laravel returned validation error bag ({ errors: { field: ["message"] } })
  if (error.response?.data?.errors && typeof error.response.data.errors === "object") {
    const errorList = Object.values(error.response.data.errors).flat();
    if (errorList.length > 0 && typeof errorList[0] === "string") {
      return errorList.join(" ");
    }
  }

  // 5. If it's a reasonably clean short message without code or file paths, display it
  if (isSafeUserMessage(raw)) {
    return raw;
  }

  return fallback;
}

function isSafeUserMessage(msg: string): boolean {
  if (msg.length === 0 || msg.length > 200) return false;
  // Check for technical signatures
  if (
    msg.includes(" at ") ||
    msg.includes("::") ||
    msg.includes("->") ||
    msg.includes(".php") ||
    msg.includes(".js") ||
    msg.includes("SQLSTATE") ||
    msg.includes("Exception") ||
    msg.includes("stack:") ||
    msg.includes("/var/www") ||
    msg.includes("C:\\") ||
    msg.includes("D:\\")
  ) {
    return false;
  }
  return true;
}
