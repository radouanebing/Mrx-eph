import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept window.fetch to support mobile applications / Capacitor wrappers and dynamic ports
const getBackendUrl = (): string => {
  if (typeof window === "undefined") {
    return "https://ais-pre-xs4jnabpag7yq4g2ol4qbd-289708497600.europe-west2.run.app";
  }

  const isHybridProtocol = 
    window.location.protocol.startsWith("capacitor") || 
    window.location.protocol.startsWith("app") || 
    window.location.protocol.startsWith("file");

  if (isHybridProtocol) {
    return "https://ais-pre-xs4jnabpag7yq4g2ol4qbd-289708497600.europe-west2.run.app";
  }

  if ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && window.location.port !== "3000") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  // Deployed or Dev URLs inside AI Studio / Cloud Run
  return window.location.origin;
};

const isCrossDomainOrNative = typeof window !== "undefined" && (
  window.location.protocol.startsWith("capacitor") || 
  window.location.protocol.startsWith("app") || 
  window.location.protocol.startsWith("file") ||
  (window.location.hostname === "localhost" && window.location.port !== "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port !== "3000")
);

if (isCrossDomainOrNative) {
  try {
    const originalFetch = window.fetch;
    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const backendUrl = getBackendUrl();
      if (typeof input === "string") {
        if (input.startsWith("/api/")) {
          return originalFetch(`${backendUrl}${input}`, init);
        }
        return originalFetch(input, init);
      } else if (input instanceof URL) {
        const urlStr = input.toString();
        if (urlStr.startsWith("/api/")) {
          return originalFetch(new URL(`${backendUrl}${input.pathname}${input.search}`), init);
        } else if (input.origin === window.location.origin && input.pathname.startsWith("/api/")) {
          return originalFetch(new URL(`${backendUrl}${input.pathname}${input.search}`), init);
        }
        return originalFetch(input, init);
      } else {
        // Request object
        const urlStr = input.url;
        if (urlStr.startsWith("/api/")) {
          const newRequest = new Request(`${backendUrl}${urlStr}`, input);
          return originalFetch(newRequest, init);
        } else if (urlStr.startsWith(window.location.origin + "/api/")) {
          const relativePath = urlStr.replace(window.location.origin, "");
          const newRequest = new Request(`${backendUrl}${relativePath}`, input);
          return originalFetch(newRequest, init);
        }
        return originalFetch(input, init);
      }
    };

    const desc = Object.getOwnPropertyDescriptor(window, "fetch");
    if (desc && desc.writable) {
      window.fetch = customFetch;
    } else {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        configurable: true,
        writable: true,
        enumerable: true
      });
    }
    console.log("[Fetch Interceptor] Active routing API requests directly to:", getBackendUrl());
  } catch (err) {
    console.warn("Unable to intercept window.fetch for sync:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

