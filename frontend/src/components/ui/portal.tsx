"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

export interface PortalProps {
  children: ReactNode;
}

/**
 * Universal Portal component that renders children directly into document.body.
 * Guarantees that modals, side popups, and drawers escape any local stacking contexts
 * (such as [isolation:isolate] or relative z-0 on main containers) and always sit above
 * fixed headers and subheaders with proper z-index.
 */
export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export default Portal;
