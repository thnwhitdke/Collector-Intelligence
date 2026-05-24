// app/components/AutoRefresh.tsx

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function getRefreshInterval(
  pathname: string,
): number | null {
  if (
    pathname.startsWith(
      "/collection/value-queue",
    )
  ) {
    return 25000;
  }

  if (
    pathname.startsWith(
      "/collection/market-intelligence",
    )
  ) {
    return 45000;
  }

  if (
    pathname.startsWith(
      "/collection/value-dashboard",
    )
  ) {
    return 60000;
  }

  if (
    pathname.startsWith(
      "/collection/market-leaders",
    )
  ) {
    return 60000;
  }

  if (
    pathname.startsWith(
      "/collection/want-list",
    )
  ) {
    return 90000;
  }

  if (
    pathname.startsWith(
      "/collection/",
    ) &&
    pathname !==
      "/collection"
  ) {
    return null;
  }

  if (
    pathname.startsWith(
      "/collection",
    )
  ) {
    return 90000;
  }

  if (
    pathname.startsWith(
      "/reports",
    )
  ) {
    return null;
  }

  if (
    pathname.startsWith(
      "/dashboard",
    )
  ) {
    return 60000;
  }

  return null;
}

export default function AutoRefresh() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  useEffect(() => {
    const intervalMs =
      getRefreshInterval(
        pathname,
      );

    function refreshNow() {
      router.refresh();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshNow();
      }
    }

    window.addEventListener(
      "focus",
      refreshNow,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    const interval =
      intervalMs
        ? window.setInterval(
            refreshNow,
            intervalMs,
          )
        : null;

    return () => {
      window.removeEventListener(
        "focus",
        refreshNow,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      if (interval) {
        clearInterval(
          interval,
        );
      }
    };
  }, [
    pathname,
    router,
  ]);

  return null;
}