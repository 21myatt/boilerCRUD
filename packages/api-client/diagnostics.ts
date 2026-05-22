import { apiEnvelopeSchema, diagnosticsResponseSchema, type DiagnosticsResponse } from "@imsys/types";
import { requestEnvelope, type RequestOptions } from "./request";

const getDiagnostics = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<DiagnosticsResponse> => {
  const body = await requestEnvelope<DiagnosticsResponse>(
    baseUrl,
    "/admin/diagnostics",
    undefined,
    options,
    apiEnvelopeSchema(diagnosticsResponseSchema)
  );
  return body.data as DiagnosticsResponse;
};

export const createDiagnosticsClient = (baseUrl: string, options?: RequestOptions) => ({
  getDiagnostics: () => getDiagnostics(baseUrl, options)
});
