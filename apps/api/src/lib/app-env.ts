import { normalizeAppEnv } from "@imsys/utils";

export const getAppEnv = () =>
  normalizeAppEnv(process.env.APP_ENV ?? process.env.NODE_ENV);
