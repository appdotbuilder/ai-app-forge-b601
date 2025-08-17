import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerUserInputSchema,
  loginUserInputSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  createFileInputSchema,
  updateFileInputSchema,
  createChatMessageInputSchema,
  createDeploymentInputSchema,
  updateDeploymentInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createProject } from './handlers/create_project';
import { updateProject } from './handlers/update_project';
import { getUserProjects } from './handlers/get_user_projects';
import { getProjectBySlug } from './handlers/get_project_by_slug';
import { deleteProject } from './handlers/delete_project';
import { createFile } from './handlers/create_file';
import { getProjectFiles } from './handlers/get_project_files';
import { updateFile } from './handlers/update_file';
import { deleteFile } from './handlers/delete_file';
import { createChatMessage } from './handlers/create_chat_message';
import { getChatMessages } from './handlers/get_chat_messages';
import { getPromptSuggestions } from './handlers/get_prompt_suggestions';
import { createDeployment } from './handlers/create_deployment';
import { updateDeployment } from './handlers/update_deployment';
import { getProjectDeployments } from './handlers/get_project_deployments';
import { simulateAIGeneration } from './handlers/simulate_ai_generation';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .query(({ input }) => loginUser(input)),

  // Project management routes
  createProject: publicProcedure
    .input(createProjectInputSchema)
    .mutation(({ input }) => createProject(input)),

  getUserProjects: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProjects(input.userId)),

  getProjectBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getProjectBySlug(input.slug)),

  updateProject: publicProcedure
    .input(updateProjectInputSchema)
    .mutation(({ input }) => updateProject(input)),

  deleteProject: publicProcedure
    .input(z.object({ projectId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteProject(input.projectId, input.userId)),

  // File management routes
  createFile: publicProcedure
    .input(createFileInputSchema)
    .mutation(({ input }) => createFile(input)),

  getProjectFiles: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(({ input }) => getProjectFiles(input.projectId)),

  updateFile: publicProcedure
    .input(updateFileInputSchema)
    .mutation(({ input }) => updateFile(input)),

  deleteFile: publicProcedure
    .input(z.object({ fileId: z.number(), projectId: z.number() }))
    .mutation(({ input }) => deleteFile(input.fileId, input.projectId)),

  // Chat functionality routes
  createChatMessage: publicProcedure
    .input(createChatMessageInputSchema)
    .mutation(({ input }) => createChatMessage(input)),

  getChatMessages: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(({ input }) => getChatMessages(input.projectId)),

  // Prompt suggestions route
  getPromptSuggestions: publicProcedure
    .query(() => getPromptSuggestions()),

  // Deployment simulation routes
  createDeployment: publicProcedure
    .input(createDeploymentInputSchema)
    .mutation(({ input }) => createDeployment(input)),

  updateDeployment: publicProcedure
    .input(updateDeploymentInputSchema)
    .mutation(({ input }) => updateDeployment(input)),

  getProjectDeployments: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(({ input }) => getProjectDeployments(input.projectId)),

  // AI generation simulation route
  simulateAIGeneration: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(({ input }) => simulateAIGeneration(input.projectId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();