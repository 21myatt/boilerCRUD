import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "@sentry/react";
import { AppProviders } from "./app/providers/AppProviders";
import { WebRouter } from "./app/router";
import "./styles/global.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={<div style={{ padding: "1.5rem" }}>Something went wrong.</div>}>
      <AppProviders>
        <WebRouter />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);
