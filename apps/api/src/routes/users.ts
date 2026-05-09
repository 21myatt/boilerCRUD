export const usersRoute = {
  get: "/users",
  post: "/users",
  put: "/users/:id"
} as const;

export const userIdPattern = /^\/users\/([^/]+)$/;
