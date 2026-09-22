import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { requireAuthUser, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me", requireAuthUser, (req, res) => {
  res.json(req.appUser);
});

router.get("/users", requireRole("owner"), async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.patch("/users/:id/role", requireRole("owner"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = z.object({ role: z.enum(["student", "moderator"]) }).safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid role change" });
    return;
  }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [updated] = await db.update(usersTable).set({ role: parsed.data.role }).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

router.delete("/users/:id", requireRole("owner"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [updated] = await db.update(usersTable).set({ role: "student" }).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

router.post("/users/:id/flag", requireRole("owner"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : null;
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  if (req.appUser?.id === id) {
    res.status(400).json({ error: "You cannot flag yourself" });
    return;
  }
  const [updated] = await db.update(usersTable).set({ blocked: true }).where(eq(usersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: updated, reason, message: "Account flagged permanently" });
});

export default router;