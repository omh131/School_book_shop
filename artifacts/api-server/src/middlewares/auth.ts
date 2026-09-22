import type { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

export type AppRole = "student" | "moderator" | "owner";

declare global {
  namespace Express {
    interface Request {
      appUser?: User;
      clerkUserId?: string;
    }
  }
}

async function loadClerkIdentity(clerkUserId: string) {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  return {
    email: clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || `${clerkUserId}@unknown.local`,
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "Student",
    imageUrl: clerkUser.imageUrl || null,
  };
}

export async function ensureLocalUser(clerkUserId: string) {
  const identity = await loadClerkIdentity(clerkUserId);
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId));

  if (existing[0]) {
    const current = existing[0];
    const nextRole: AppRole = ownerEmail && identity.email === ownerEmail ? "owner" : (current.role as AppRole);
    if (current.email !== identity.email || current.name !== identity.name || current.imageUrl !== identity.imageUrl || current.role !== nextRole) {
      const [updated] = await db
        .update(usersTable)
        .set({ email: identity.email, name: identity.name, imageUrl: identity.imageUrl, role: nextRole })
        .where(eq(usersTable.id, current.id))
        .returning();
      return updated;
    }
    return current;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId: clerkUserId,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.imageUrl,
      role: ownerEmail && identity.email === ownerEmail ? "owner" : "student",
    })
    .returning();
  return created;
}

export async function attachCurrentUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;
    if (clerkUserId) {
      req.clerkUserId = clerkUserId;
      req.appUser = await ensureLocalUser(clerkUserId);
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuthUser(req: Request, res: Response, next: NextFunction) {
  await attachCurrentUser(req, res, () => undefined);
  if (!req.appUser || !req.clerkUserId) {
    res.status(401).json({ error: "Sign in is required" });
    return;
  }
  if (req.appUser.blocked) {
    res.status(403).json({ error: "This account cannot place orders" });
    return;
  }
  next();
}

export function requireRole(...roles: AppRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuthUser(req, res, () => undefined);
    if (res.headersSent) return;
    if (!req.appUser || !roles.includes(req.appUser.role as AppRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}