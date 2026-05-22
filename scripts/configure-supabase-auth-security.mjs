import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const envPath = path.join(rootDir, ".env");

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8");
  const entries = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const divider = line.indexOf("=");
      if (divider === -1) {
        return null;
      }

      return [line.slice(0, divider).trim(), line.slice(divider + 1).trim()];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
};

const env = {
  ...readEnvFile(envPath),
  ...process.env
};

const fail = (message) => {
  console.error(`auth hardening failed: ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`- ${message}`);
};

const parseCsv = (value) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toUrl = (value, label) => {
  try {
    return new URL(value);
  } catch {
    fail(`${label} is invalid`);
  }
};

const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim() || env.SUPABASE_MANAGEMENT_TOKEN?.trim();
const supabaseUrl = env.SUPABASE_URL?.trim();

if (!accessToken) {
  fail("missing SUPABASE_ACCESS_TOKEN or SUPABASE_MANAGEMENT_TOKEN");
}

if (!supabaseUrl) {
  fail("missing SUPABASE_URL");
}

let projectRef;

try {
  projectRef = new URL(supabaseUrl).hostname.split(".")[0];
} catch {
  fail("SUPABASE_URL is invalid");
}

const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const passwordRequiredCharacters = env.SUPABASE_PASSWORD_REQUIRED_CHARACTERS
  ?? "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const configuredSiteUrl = env.SUPABASE_AUTH_SITE_URL?.trim() || env.INVITE_REDIRECT_TO?.trim();

const derivedAllowList = () => {
  if (env.SUPABASE_AUTH_URI_ALLOW_LIST?.trim()) {
    return parseCsv(env.SUPABASE_AUTH_URI_ALLOW_LIST);
  }

  const entries = new Set();
  const configuredOrigins = parseCsv(env.INVITE_REDIRECT_ORIGINS ?? env.CORS_ORIGINS);

  for (const entry of configuredOrigins) {
    const normalizedOrigin = toUrl(entry, "INVITE_REDIRECT_ORIGINS or CORS_ORIGINS entry").origin;
    entries.add(normalizedOrigin);
    entries.add(`${normalizedOrigin}/**`);
  }

  if (configuredSiteUrl) {
    const siteUrl = toUrl(configuredSiteUrl, "SUPABASE_AUTH_SITE_URL or INVITE_REDIRECT_TO");
    entries.add(siteUrl.toString());
    entries.add(siteUrl.origin);
    entries.add(`${siteUrl.origin}/**`);
  }

  return [...entries];
};

const allowListEntries = derivedAllowList();

const desiredPatch = {
  password_hibp_enabled: true,
  password_min_length: 12,
  password_required_characters: passwordRequiredCharacters,
  ...(configuredSiteUrl ? { site_url: toUrl(configuredSiteUrl, "SUPABASE_AUTH_SITE_URL or INVITE_REDIRECT_TO").toString() } : {}),
  ...(allowListEntries.length > 0 ? { uri_allow_list: allowListEntries.join(",") } : {})
};

const fetchJson = async (url, init) => {
  const response = await fetch(url, init);
  const text = await response.text();

  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = typeof body === "string"
      ? body
      : body?.message ?? body?.error ?? JSON.stringify(body);
    throw new Error(`${response.status} ${message}`);
  }

  return body;
};

const currentConfig = await fetchJson(managementApiUrl, {
  headers: {
    authorization: `Bearer ${accessToken}`
  }
});

info(`project ref ${projectRef}`);
info(`current password_hibp_enabled=${String(currentConfig.password_hibp_enabled)}`);
info(`current password_min_length=${String(currentConfig.password_min_length)}`);
info(`current password_required_characters=${String(currentConfig.password_required_characters)}`);
info(`current site_url=${String(currentConfig.site_url)}`);
info(`current uri_allow_list=${String(currentConfig.uri_allow_list)}`);

const nextConfig = await fetchJson(managementApiUrl, {
  method: "PATCH",
  headers: {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json"
  },
  body: JSON.stringify(desiredPatch)
});

info(`updated password_hibp_enabled=${String(nextConfig.password_hibp_enabled)}`);
info(`updated password_min_length=${String(nextConfig.password_min_length)}`);
info(`updated password_required_characters=${String(nextConfig.password_required_characters)}`);
info(`updated site_url=${String(nextConfig.site_url)}`);
info(`updated uri_allow_list=${String(nextConfig.uri_allow_list)}`);
console.log("auth hardening ok");
