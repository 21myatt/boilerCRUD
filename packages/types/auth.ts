import type { ID } from "./common";

export type Session = {
  id: ID;
  userId: ID;
  expiresAt: string;
};

