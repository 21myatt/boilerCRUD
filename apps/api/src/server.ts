import { createServer } from "node:http";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AuthError, buildAuthenticatedUser, verifyAccessToken } from "@imsys/auth/middleware";
import { config as loadEnv } from "dotenv";
import { logger } from "@imsys/utils";
import { PermissionDeniedError, requirePermission } from "./middleware/role-permission-check";
import { categoriesRoute, categoryIdPattern } from "./routes/categories";
import { itemsRoute, itemIdPattern } from "./routes/items";
import { userIdPattern, usersRoute } from "./routes/users";
import { listRecentAuditLogs } from "./services/audit-logs";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./services/categories";
import { createItem, deleteItem, listItems, updateItem } from "./services/items";
import { getDiagnostics } from "./services/diagnostics";
import { ensureProfileForIdentity } from "./services/profiles";
import { createUser, listUsers, updateUser } from "./services/users";
import { createCategorySchema, updateCategorySchema } from "./validators/category";
import { createItemSchema, updateItemSchema } from "./validators/item";
import { createUserSchema, updateUserSchema } from "./validators/user";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:8081")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const getCorsOrigin = (requestOrigin?: string | null) => {
  if (!requestOrigin) {
    return null;
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
};

const setCorsHeaders = (response: ServerResponse, requestOrigin?: string | null) => {
  const allowedOrigin = getCorsOrigin(requestOrigin);

  if (allowedOrigin) {
    response.setHeader("access-control-allow-origin", allowedOrigin);
    response.setHeader("vary", "origin");
  }

  response.setHeader("access-control-allow-headers", "authorization, content-type");
  response.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
};

const sendJson = (response: ServerResponse, payload: unknown, statusCode = 200) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
};

const sendError = (response: ServerResponse, statusCode: number, message: string) => {
  sendJson(response, { error: message }, statusCode);
};

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) as unknown : {};
};

const requireCurrentUser = async (authorizationHeader?: string) => {
  const identity = await verifyAccessToken(authorizationHeader);
  const profile = await ensureProfileForIdentity(identity);

  return buildAuthenticatedUser(identity, profile);
};

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response, request.headers.origin);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/diagnostics") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "users", "read");
      const diagnostics = await getDiagnostics();
      sendJson(response, { data: diagnostics });
      return;
    }

    if (request.method === "GET" && url.pathname === "/admin/audit-logs") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "users", "read");
      const logs = await listRecentAuditLogs();
      sendJson(response, { data: logs });
      return;
    }

    if (request.method === "GET" && url.pathname === itemsRoute.get) {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "items", "read");
      const items = await listItems(currentUser.id);
      sendJson(response, { data: items });
      return;
    }

    if (request.method === "POST" && url.pathname === itemsRoute.post) {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "items", "create");
      const body = createItemSchema.parse(await readBody(request));
      const item = await createItem(currentUser.id, body);
      sendJson(response, { data: item }, 201);
      return;
    }

    if (request.method === "GET" && url.pathname === categoriesRoute.get) {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "categories", "read");
      const categories = await listCategories(currentUser.id);
      sendJson(response, { data: categories });
      return;
    }

    if (request.method === "POST" && url.pathname === categoriesRoute.post) {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "categories", "create");
      const body = createCategorySchema.parse(await readBody(request));
      const category = await createCategory(currentUser.id, body);
      sendJson(response, { data: category }, 201);
      return;
    }

    if (request.method === "GET" && url.pathname === usersRoute.get) {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "users", "read");
      const users = await listUsers();
      sendJson(response, { data: users });
      return;
    }

    if (request.method === "POST" && url.pathname === usersRoute.post) {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "users", "create");
      const body = createUserSchema.parse(await readBody(request));
      const user = await createUser(body, currentUser.id);
      sendJson(response, { data: user }, 201);
      return;
    }

    const itemMatch = url.pathname.match(itemIdPattern);
    const categoryMatch = url.pathname.match(categoryIdPattern);
    const userMatch = url.pathname.match(userIdPattern);

    if (itemMatch && request.method === "PUT") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "items", "update");
      const body = updateItemSchema.parse(await readBody(request));
      const item = await updateItem(currentUser.id, itemMatch[1], body);

      if (!item) {
        sendError(response, 404, "Item not found");
        return;
      }

      sendJson(response, { data: item });
      return;
    }

    if (itemMatch && request.method === "DELETE") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "items", "delete");
      const removed = await deleteItem(currentUser.id, itemMatch[1]);

      if (!removed) {
        sendError(response, 404, "Item not found");
        return;
      }

      sendJson(response, { data: true });
      return;
    }

    if (categoryMatch && request.method === "PUT") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "categories", "update");
      const body = updateCategorySchema.parse(await readBody(request));
      const category = await updateCategory(currentUser.id, categoryMatch[1], body);

      if (!category) {
        sendError(response, 404, "Category not found");
        return;
      }

      sendJson(response, { data: category });
      return;
    }

    if (categoryMatch && request.method === "DELETE") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "categories", "delete");
      const removed = await deleteCategory(currentUser.id, categoryMatch[1]);

      if (!removed) {
        sendError(response, 404, "Category not found");
        return;
      }

      sendJson(response, { data: true });
      return;
    }

    if (userMatch && request.method === "PUT") {
      const currentUser = await requireCurrentUser(request.headers.authorization);
      requirePermission(currentUser, "users", "update");
      const body = updateUserSchema.parse(await readBody(request));
      const user = await updateUser(userMatch[1], body, currentUser.id);

      if (!user) {
        sendError(response, 404, "User not found");
        return;
      }

      sendJson(response, { data: user });
      return;
    }

    sendError(response, 404, "Not found");
  } catch (error) {
    if (error instanceof AuthError) {
      sendError(response, 401, error.message);
      return;
    }

    if (error instanceof PermissionDeniedError) {
      sendError(response, 403, error.message);
      return;
    }

    if (error instanceof SyntaxError) {
      sendError(response, 400, "Invalid JSON body");
      return;
    }

    if (error instanceof Error) {
      logger.error("Request failed", error.message);
      sendError(response, 400, error.message);
      return;
    }

    sendError(response, 500, "Unexpected server error");
  }
});

server.listen(port, () => {
  logger.info(`API listening on http://localhost:${port}`);
});
