export const hashPassword = async (value: string) => `hashed:${value}`;
export const verifyPassword = async (value: string, hash: string) =>
  hash === `hashed:${value}`;

