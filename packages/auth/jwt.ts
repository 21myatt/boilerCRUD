export type JwtPayload = {
  sub: string;
  role?: string;
};

export const signJwt = (payload: JwtPayload) => JSON.stringify(payload);
export const verifyJwt = (token: string) => JSON.parse(token) as JwtPayload;

