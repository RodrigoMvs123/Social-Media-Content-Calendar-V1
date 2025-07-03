"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPostSchema = exports.posts = exports.insertUserSchema = exports.users = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_zod_1 = require("drizzle-zod");
// User schema
exports.users = (0, sqlite_core_1.sqliteTable)("users", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    username: (0, sqlite_core_1.text)("username").notNull().unique(),
    password: (0, sqlite_core_1.text)("password").notNull(),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    username: true,
    password: true,
});
// Post schema for the social media calendar
exports.posts = (0, sqlite_core_1.sqliteTable)("posts", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    platform: (0, sqlite_core_1.text)("platform").notNull(),
    content: (0, sqlite_core_1.text)("content").notNull(),
    scheduledTime: (0, sqlite_core_1.integer)("scheduled_time", { mode: "timestamp" }).notNull(),
    status: (0, sqlite_core_1.text)("status").default("draft"),
    createdAt: (0, sqlite_core_1.integer)("created_at", { mode: "timestamp" }).defaultNow(),
    updatedAt: (0, sqlite_core_1.integer)("updated_at", { mode: "timestamp" }).defaultNow(),
    userId: (0, sqlite_core_1.integer)("user_id").references(() => exports.users.id),
});
exports.insertPostSchema = (0, drizzle_zod_1.createInsertSchema)(exports.posts).pick({
    platform: true,
    content: true,
    scheduledTime: true,
    status: true,
    userId: true,
});
