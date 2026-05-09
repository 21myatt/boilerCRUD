const getSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
  }

  return supabaseUrl.replace(/\/$/, "");
};

const getServiceRoleKey = () => {
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Admin user management requires SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in the root .env. Restart the API after setting it."
    );
  }

  return serviceRoleKey;
};

export const getSupabaseAdminHeaders = () => ({
  apikey: getServiceRoleKey(),
  authorization: `Bearer ${getServiceRoleKey()}`,
  "content-type": "application/json"
});

export const getSupabaseAdminUrl = (pathname: string) =>
  `${getSupabaseUrl()}/auth/v1${pathname}`;

export const getSupabaseRestUrl = (pathname: string) =>
  `${getSupabaseUrl()}/rest/v1${pathname}`;
