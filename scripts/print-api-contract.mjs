const contract = {
  openapi: "3.1.0",
  info: {
    title: "IMSYS Boilerplate API Contract",
    version: "1.0.0",
  },
  resources: {
    items: {
      path: "/items",
      list: "itemListSchema",
      create: "itemCreateInputSchema -> itemSchema",
      update: "itemUpdateInputSchema -> itemSchema",
      schemas: ["itemSchema", "itemCreateInputSchema", "itemUpdateInputSchema"],
    },
    categories: {
      path: "/categories",
      list: "categoryListSchema",
      create: "categoryCreateInputSchema -> categorySchema",
      update: "categoryUpdateInputSchema -> categorySchema",
      schemas: ["categorySchema", "categoryCreateInputSchema", "categoryUpdateInputSchema"],
    },
    users: {
      path: "/users",
      list: "managedUserListSchema",
      create: "managedUserCreateInputSchema -> managedUserSchema",
      update: "managedUserUpdateInputSchema -> managedUserSchema",
      schemas: ["managedUserSchema", "managedUserCreateInputSchema", "managedUserUpdateInputSchema"],
    },
    diagnostics: {
      path: "/admin/diagnostics",
      read: "diagnosticsResponseSchema",
      schemas: ["diagnosticsResponseSchema"],
    },
    auditLogs: {
      path: "/admin/audit-logs",
      read: "auditLogListSchema",
      schemas: ["auditLogListSchema"],
    },
  },
  envelopeSchemas: [
    "apiEnvelopeSchema(itemListSchema)",
    "apiEnvelopeSchema(categoryListSchema)",
    "apiEnvelopeSchema(managedUserListSchema)",
    "apiEnvelopeSchema(diagnosticsResponseSchema)",
    "apiEnvelopeSchema(auditLogListSchema)",
    "apiEnvelopeSchema(itemSchema)",
    "apiEnvelopeSchema(categorySchema)",
    "apiEnvelopeSchema(managedUserSchema)",
  ],
  sourceSchemas: {
    itemSchema: true,
    itemCreateInputSchema: true,
    itemUpdateInputSchema: true,
    categorySchema: true,
    categoryCreateInputSchema: true,
    categoryUpdateInputSchema: true,
    managedUserSchema: true,
    managedUserCreateInputSchema: true,
    managedUserUpdateInputSchema: true,
    itemListSchema: true,
    categoryListSchema: true,
    managedUserListSchema: true,
    diagnosticsResponseSchema: true,
    auditLogListSchema: true,
    apiEnvelopeSchema: true,
  },
};

process.stdout.write(`${JSON.stringify(contract, null, 2)}\n`);
