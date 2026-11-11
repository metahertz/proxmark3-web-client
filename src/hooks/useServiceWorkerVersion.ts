import { useEffect, useState } from "react";

/**
 * The cache version of the active service worker (e.g. "v3"), or null when no
 * worker is controlling the page (dev server, private window, not yet
 * registered). Asks the worker over a MessageChannel; the worker replies from
 * its GET_VERSION handler in coi-serviceworker.js.
 */
export function useServiceWorkerVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    const ask = (worker: ServiceWorker | null) => {
      if (!worker) return;
      try {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (!cancelled && typeof event.data?.version === "string") {
            setVersion(event.data.version);
          }
        };
        worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
      } catch {
        // Ignore: version is a nicety, not required for the app to work.
      }
    };

    navigator.serviceWorker.ready
      .then((registration) => ask(registration.active ?? navigator.serviceWorker.controller))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
