import type { Request } from "express";

export type UserRole = "TEACHER" | "STUDENT";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type UserRow = AuthUser & {
  password_hash: string;
};

export type JwtPayload = {
  userId: number;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
