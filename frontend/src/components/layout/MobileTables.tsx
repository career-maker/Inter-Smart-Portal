"use client";

import { useEffect } from "react";

/**
 * On phones, wide data tables turn into one card per row: each cell shows its column title above its value,
 * so nothing is squeezed, clipped or overlapped by sideways scrolling. Done once here for every table (see globals.css, ".m-cards").
 * Skipped for tables with more than 9 columns (matrices, inline-edit grids) and any table marked data-no-cards.
 */
export function MobileTables() {
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    let timer: ReturnType<typeof setTimeout> | undefined;

    const label = (th: Element) => (th.textContent || "").replace(/\s+/g, " ").trim();

    const enhance = () => {
      document.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
        if (!mq.matches || table.hasAttribute("data-no-cards")) {
          table.classList.remove("m-cards");
          return;
        }
        const heads = Array.from(table.querySelectorAll(":scope > thead > tr:last-child > th"));
        if (heads.length < 2 || heads.length > 9 || heads.some((h) => h.hasAttribute("colspan"))) return;
        table.classList.add("m-cards");
        table.querySelectorAll(":scope > tbody > tr").forEach((row) => {
          const cells = Array.from(row.children).filter((c) => c.tagName === "TD") as HTMLElement[];
          if (cells.length !== heads.length) return; // a message row (colspan) stays a plain row
          cells.forEach((cell, i) => {
            const text = label(heads[i]);
            if (text && cell.dataset.label !== text) cell.dataset.label = text;
          });
        });
      });
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(enhance, 80);
    };

    enhance();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    mq.addEventListener("change", enhance);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", enhance);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
