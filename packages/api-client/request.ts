type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

type RequestOptions = {
  getAccessToken?: () => Promise<string | null> | string | null;
};

const hasScheme = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);

const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);

const getCurrentOrigin = () => {
  if (typeof window === "undefined" || !window.location?.origin) {
    throw new Error("Relative API base URLs require a browser environment");
  }

  return window.location.origin;
};

const buildTargetUrl = (baseUrl: string, path: string) => {
  const normalizedBaseUrl = ensureTrailingSlash(baseUrl.trim());
  const normalizedPath = path.replace(/^\/+/, "");
  const resolvedBaseUrl = hasScheme(normalizedBaseUrl)
    ? normalizedBaseUrl
    : new URL(normalizedBaseUrl, getCurrentOrigin()).toString();

  return new URL(normalizedPath, resolvedBaseUrl);
};

export const requestEnvelope = async <T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  options?: RequestOptions
): Promise<ApiEnvelope<T>> => {
  const accessToken = await options?.getAccessToken?.();
  const targetUrl = buildTargetUrl(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {})
      },
      ...init
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`${message} while calling ${targetUrl.toString()}`);
  }

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }

  return body;
};

export type { ApiEnvelope, RequestOptions };
