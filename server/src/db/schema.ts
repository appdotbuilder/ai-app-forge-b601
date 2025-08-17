import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  ai_prompt: text('ai_prompt').notNull(),
  slug: text('slug').notNull().unique(),
  is_deployed: boolean('is_deployed').notNull().default(false),
  deployment_url: text('deployment_url'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Files table for codebase data
export const filesTable = pgTable('files', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projectsTable.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  name: text('name').notNull(),
  content: text('content').notNull().default(''),
  is_folder: boolean('is_folder').notNull().default(false),
  parent_path: text('parent_path'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Chat messages table
export const chatMessagesTable = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projectsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  response: text('response'), // Nullable by default
  is_ai_response: boolean('is_ai_response').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Prompt suggestions table
export const promptSuggestionsTable = pgTable('prompt_suggestions', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  category: text('category'), // Nullable by default
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Deployment status enum
export const deploymentStatusEnum = pgEnum('deployment_status', ['pending', 'building', 'deployed', 'failed']);

// Deployments table
export const deploymentsTable = pgTable('deployments', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projectsTable.id, { onDelete: 'cascade' }),
  status: deploymentStatusEnum('status').notNull().default('pending'),
  deployment_url: text('deployment_url'), // Nullable by default
  build_logs: text('build_logs'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at') // Nullable by default
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  projects: many(projectsTable),
  chatMessages: many(chatMessagesTable)
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [projectsTable.user_id],
    references: [usersTable.id]
  }),
  files: many(filesTable),
  chatMessages: many(chatMessagesTable),
  deployments: many(deploymentsTable)
}));

export const filesRelations = relations(filesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [filesTable.project_id],
    references: [projectsTable.id]
  })
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [chatMessagesTable.project_id],
    references: [projectsTable.id]
  }),
  user: one(usersTable, {
    fields: [chatMessagesTable.user_id],
    references: [usersTable.id]
  })
}));

export const deploymentsRelations = relations(deploymentsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [deploymentsTable.project_id],
    references: [projectsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
export type File = typeof filesTable.$inferSelect;
export type NewFile = typeof filesTable.$inferInsert;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;
export type PromptSuggestion = typeof promptSuggestionsTable.$inferSelect;
export type NewPromptSuggestion = typeof promptSuggestionsTable.$inferInsert;
export type Deployment = typeof deploymentsTable.$inferSelect;
export type NewDeployment = typeof deploymentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  projects: projectsTable,
  files: filesTable,
  chatMessages: chatMessagesTable,
  promptSuggestions: promptSuggestionsTable,
  deployments: deploymentsTable
};