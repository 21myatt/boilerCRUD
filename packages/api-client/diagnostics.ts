type DiagnosticsResponse = {
  checkedAt: string;
  checks: Record<string, {
    ok: boolean;
    expected?: string | null;
    actual?: string | null;
  }>;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

type RequestOptions = {
  getAccessToken?: () => Promise<string | null> | string | null;
};

const getDiagnostics = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<DiagnosticsResponse> => {
  const accessToken = await options?.getAccessToken?.();
  const response = await fetch(new URL("/admin/diagnostics", baseUrl), {
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
    }
  });
  const body = await response.json() as ApiEnvelope<DiagnosticsResponse>;

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }

  return body.data as DiagnosticsResponse;
};

export const createDiagnosticsClient = (baseUrl: string, options?: RequestOptions) => ({
  getDiagnostics: () => getDiagnostics(baseUrl, options)
});

export type { DiagnosticsResponse };
