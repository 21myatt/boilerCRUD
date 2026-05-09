const RETRIABLE_MESSAGES = [
  "network",
  "fetch",
  "timeout",
  "503",
  "502",
  "failed to load",
  "temporarily unavailable"
];

export const isRetriableQueryError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return RETRIABLE_MESSAGES.some((fragment) => message.includes(fragment));
};

export const shouldRetryQuery = (failureCount: number, error: unknown) =>
  failureCount < 2 && isRetriableQueryError(error);
