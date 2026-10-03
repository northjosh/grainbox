import * as d from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { generateSandboxName } from "../src/lib/generate-name.js";
import { randomUUID, randomUUIDv7 } from "node:crypto";
import { SESSION_TTL_SECONDS } from "../src/constants.js";

export const users = d.sqliteTable('users', {
    id: d.text().$default(() => randomUUID()).primaryKey(),
    name: d.text().notNull(),
    email: d.text().notNull(),
    role: d.text().$type<"guest" | "user" | "admin">().default("user"),
    password: d.text().notNull(),
    salt: d.text().notNull(),
    limit: d.integer(),
    createdAt: d.text().$defaultFn(() => new Date().toISOString()).notNull()
}, (table) => [
    d.uniqueIndex("email_idx").on(table.email)
]);

export const sessions = d.sqliteTable('sessions', {
    id: d.text().$default(() => randomUUID()).primaryKey(),
    userId: d.text().notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionToken: d.text().notNull().unique(),
    expiresAt: d.text().$defaultFn(() => new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()).notNull(),
    createdAt: d.text().$defaultFn(() => new Date().toISOString()).notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const sandboxes = d.sqliteTable('sandboxes', {
    id: d.text().$default(() => randomUUIDv7()).primaryKey(),
    name: d.text().$default(() => generateSandboxName()),
    user: d.text().references((): d.AnySQLiteColumn => users.id),
    memory: d.integer().default(512),
    cpu: d.integer().default(1),
    createdAt: d.text().$defaultFn(() => new Date().toISOString()).notNull(),
    emephemeral: d.integer({ mode: 'boolean' }).default(true)
}, (table) => [
    d.uniqueIndex("name_idx").on(table.name)
]);

export const sandboxRelations = relations(sandboxes, ({ one }) => ({
    user: one(users, {
        fields: [sandboxes.user],
        references: [users.id],
    }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SandboxRecord = typeof sandboxes.$inferSelect;
export type NewSandbox = typeof sandboxes.$inferInsert;
