import { z } from 'zod';

// User authentication schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Project management schemas
export const projectSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  ai_prompt: z.string(),
  slug: z.string(),
  is_deployed: z.boolean(),
  deployment_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable(),
  ai_prompt: z.string().min(1)
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  ai_prompt: z.string().min(1).optional(),
  is_deployed: z.boolean().optional(),
  deployment_url: z.string().nullable().optional()
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

// File system schemas for codebase data
export const fileSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  path: z.string(),
  name: z.string(),
  content: z.string(),
  is_folder: z.boolean(),
  parent_path: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type File = z.infer<typeof fileSchema>;

export const createFileInputSchema = z.object({
  project_id: z.number(),
  path: z.string(),
  name: z.string().min(1),
  content: z.string().default(''),
  is_folder: z.boolean().default(false),
  parent_path: z.string().nullable()
});

export type CreateFileInput = z.infer<typeof createFileInputSchema>;

export const updateFileInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  path: z.string().optional()
});

export type UpdateFileInput = z.infer<typeof updateFileInputSchema>;

// Chat interaction schemas
export const chatMessageSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  user_id: z.number(),
  message: z.string(),
  response: z.string().nullable(),
  is_ai_response: z.boolean(),
  created_at: z.coerce.date()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const createChatMessageInputSchema = z.object({
  project_id: z.number(),
  user_id: z.number(),
  message: z.string().min(1)
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

// Prompt suggestions schema
export const promptSuggestionSchema = z.object({
  id: z.number(),
  text: z.string(),
  category: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type PromptSuggestion = z.infer<typeof promptSuggestionSchema>;

export const createPromptSuggestionInputSchema = z.object({
  text: z.string().min(1),
  category: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export type CreatePromptSuggestionInput = z.infer<typeof createPromptSuggestionInputSchema>;

// Deployment simulation schemas
export const deploymentSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  status: z.enum(['pending', 'building', 'deployed', 'failed']),
  deployment_url: z.string().nullable(),
  build_logs: z.string().nullable(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type Deployment = z.infer<typeof deploymentSchema>;

export const createDeploymentInputSchema = z.object({
  project_id: z.number()
});

export type CreateDeploymentInput = z.infer<typeof createDeploymentInputSchema>;

export const updateDeploymentInputSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'building', 'deployed', 'failed']).optional(),
  deployment_url: z.string().nullable().optional(),
  build_logs: z.string().nullable().optional(),
  completed_at: z.coerce.date().nullable().optional()
});

export type UpdateDeploymentInput = z.infer<typeof updateDeploymentInputSchema>;