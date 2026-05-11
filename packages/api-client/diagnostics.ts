type DiagnosticsResponse = {
  checkedAt: string;
  checks: Record<string, {
    ok: boolean;
    expected?: string | null;
    actual?: string | null;
  }>;
};
import { requestEnvelope, type RequestOptions } from "./request";

const getDiagnostics = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<DiagnosticsResponse> => {
  const body = await requestEnvelope<DiagnosticsResponse>(
    baseUrl,
    "/admin/diagnostics",
    undefined,
    options
  );
  return body.data as DiagnosticsResponse;
};

export const createDiagnosticsClient = (baseUrl: string, options?: RequestOptions) => ({
  getDiagnostics: () => getDiagnostics(baseUrl, options)
});

export type { DiagnosticsResponse };
