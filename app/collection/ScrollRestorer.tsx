"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const key = `collection-scroll:${query ? `${pathname}?${query}` : pathname}`;
    const savedScroll = sessionStorage.getItem(key);

    if (!savedScroll) return;

    const scrollY = Number(savedScroll);

    window.setTimeout(() => {
      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });

      sessionStorage.removeItem(key);
    }, 150);
  }, [pathname, searchParams]);

  return null;
}