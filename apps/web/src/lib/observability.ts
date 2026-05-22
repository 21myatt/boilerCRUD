import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

let initialized = false;
let posthogEnabled = false;

const getStringEnv = (value: string | undefined) => value?.trim() || "";

export const initClientObservability = () => {
  if (initialized) {
    return;
  }

  const sentryDsn = getStringEnv(import.meta.env.VITE_SENTRY_DSN);
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      enabled: true,
      tracesSampleRate: 0
    });
  }

  const posthogKey = getStringEnv(import.meta.env.VITE_POSTHOG_KEY);
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: getStringEnv(import.meta.env.VITE_POSTHOG_HOST) || "https://app.posthog.com",
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true
    });
    posthogEnabled = true;
  }

  initialized = true;
};

export const captureFrontendPerformance = () => {
  if (!posthogEnabled || typeof performance === "undefined") {
    return;
  }

  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!navigation) {
    return;
  }

  posthog.capture("frontend_performance", {
    service: "your-app-web",
    environment: import.meta.env.MODE,
    domContentLoaded: navigation.domContentLoadedEventEnd,
    loadEventEnd: navigation.loadEventEnd,
    responseStart: navigation.responseStart,
    totalDuration: navigation.duration
  });
};
