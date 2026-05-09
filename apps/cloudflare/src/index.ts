interface Env {
  APP_ENV?: string;
  APP_NAME?: string;
  API_ORIGIN?: string;
  CORS_ORIGINS?: string;
}

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers,
  });
}

function allowedOrigin(request: Request, env: Env): string | null {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return null;
  }

  const allowedOrigins = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    return requestOrigin;
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
}

function withCorsHeaders(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  const origin = allowedOrigin(request, env);

  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }

  headers.set("access-control-allow-methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "Authorization,Content-Type");
  headers.set("access-control-max-age", "86400");
  headers.set("x-edge-runtime", "cloudflare-workers");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function notConfigured(request: Request, env: Env): Response {
  return withCorsHeaders(
    json(
      {
        error: "API_ORIGIN is not configured",
        hint: "Set API_ORIGIN in apps/cloudflare/.dev.vars or in Wrangler environment variables.",
      },
      { status: 501 },
    ),
    request,
    env,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCorsHeaders(new Response(null, { status: 204 }), request, env);
    }

    if (url.pathname === "/") {
      return withCorsHeaders(
        json({
          ok: true,
          service: env.APP_NAME ?? "cloudflare-edge",
          environment: env.APP_ENV ?? "development",
          routes: ["/", "/health", "/api/*"],
          proxyEnabled: Boolean(env.API_ORIGIN),
        }),
        request,
        env,
      );
    }

    if (url.pathname === "/health") {
      return withCorsHeaders(
        json({
          ok: true,
          service: env.APP_NAME ?? "cloudflare-edge",
          environment: env.APP_ENV ?? "development",
          timestamp: new Date().toISOString(),
        }),
        request,
        env,
      );
    }

    if (url.pathname.startsWith("/api/")) {
      if (!env.API_ORIGIN) {
        return notConfigured(request, env);
      }

      const upstream = new URL(url.pathname.replace(/^\/api/, "") || "/", env.API_ORIGIN);
      upstream.search = url.search;

      const headers = new Headers(request.headers);
      headers.set("x-forwarded-host", url.host);
      headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

      const upstreamRequest = new Request(upstream.toString(), {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
      });

      const upstreamResponse = await fetch(upstreamRequest);
      return withCorsHeaders(upstreamResponse, request, env);
    }

    return withCorsHeaders(
      json(
        {
          error: "Not found",
          path: url.pathname,
        },
        { status: 404 },
      ),
      request,
      env,
    );
  },
};
