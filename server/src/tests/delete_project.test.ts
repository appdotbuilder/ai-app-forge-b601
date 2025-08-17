import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  projectsTable, 
  filesTable, 
  chatMessagesTable, 
  deploymentsTable 
} from '../db/schema';
import { deleteProject } from '../handlers/delete_project';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  name: 'Test User'
};

const testProject = {
  name: 'Test Project',
  description: 'A project for testing deletion',
  ai_prompt: 'Create a test application',
  slug: 'test-project-delete'
};

describe('deleteProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a project owned by the user', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Delete the project
    const result = await deleteProject(project.id, user.id);

    expect(result).toBe(true);

    // Verify project is actually deleted
    const remainingProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project.id))
      .execute();

    expect(remainingProjects).toHaveLength(0);
  });

  it('should return false when project does not exist', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Try to delete non-existent project
    const result = await deleteProject(99999, user.id);

    expect(result).toBe(false);
  });

  it('should return false when project belongs to different user', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com',
        name: 'User Two'
      })
      .returning()
      .execute();

    // Create project owned by user1
    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user1.id
      })
      .returning()
      .execute();

    // Try to delete with user2
    const result = await deleteProject(project.id, user2.id);

    expect(result).toBe(false);

    // Verify project still exists
    const remainingProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project.id))
      .execute();

    expect(remainingProjects).toHaveLength(1);
  });

  it('should cascade delete associated files when project is deleted', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create associated files
    await db.insert(filesTable)
      .values([
        {
          project_id: project.id,
          path: '/src/index.js',
          name: 'index.js',
          content: 'console.log("Hello World");',
          is_folder: false,
          parent_path: '/src'
        },
        {
          project_id: project.id,
          path: '/src',
          name: 'src',
          content: '',
          is_folder: true,
          parent_path: null
        }
      ])
      .execute();

    // Verify files exist before deletion
    const filesBefore = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, project.id))
      .execute();

    expect(filesBefore).toHaveLength(2);

    // Delete the project
    const result = await deleteProject(project.id, user.id);

    expect(result).toBe(true);

    // Verify associated files are cascade deleted
    const filesAfter = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, project.id))
      .execute();

    expect(filesAfter).toHaveLength(0);
  });

  it('should cascade delete associated chat messages when project is deleted', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create associated chat messages
    await db.insert(chatMessagesTable)
      .values([
        {
          project_id: project.id,
          user_id: user.id,
          message: 'Hello AI',
          response: 'Hello! How can I help you?',
          is_ai_response: false
        },
        {
          project_id: project.id,
          user_id: user.id,
          message: 'AI Response',
          response: null,
          is_ai_response: true
        }
      ])
      .execute();

    // Verify messages exist before deletion
    const messagesBefore = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.project_id, project.id))
      .execute();

    expect(messagesBefore).toHaveLength(2);

    // Delete the project
    const result = await deleteProject(project.id, user.id);

    expect(result).toBe(true);

    // Verify associated chat messages are cascade deleted
    const messagesAfter = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.project_id, project.id))
      .execute();

    expect(messagesAfter).toHaveLength(0);
  });

  it('should cascade delete associated deployments when project is deleted', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create associated deployments
    await db.insert(deploymentsTable)
      .values([
        {
          project_id: project.id,
          status: 'deployed',
          deployment_url: 'https://test-app.netlify.app',
          build_logs: 'Build successful'
        },
        {
          project_id: project.id,
          status: 'failed',
          deployment_url: null,
          build_logs: 'Build failed due to syntax error'
        }
      ])
      .execute();

    // Verify deployments exist before deletion
    const deploymentsBefore = await db.select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.project_id, project.id))
      .execute();

    expect(deploymentsBefore).toHaveLength(2);

    // Delete the project
    const result = await deleteProject(project.id, user.id);

    expect(result).toBe(true);

    // Verify associated deployments are cascade deleted
    const deploymentsAfter = await db.select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.project_id, project.id))
      .execute();

    expect(deploymentsAfter).toHaveLength(0);
  });

  it('should delete project with all associated data in a single operation', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create comprehensive associated data
    await db.insert(filesTable)
      .values({
        project_id: project.id,
        path: '/README.md',
        name: 'README.md',
        content: '# Test Project\n\nThis is a test project.',
        is_folder: false,
        parent_path: null
      })
      .execute();

    await db.insert(chatMessagesTable)
      .values({
        project_id: project.id,
        user_id: user.id,
        message: 'Create a README file',
        response: 'I created a README.md file for you.',
        is_ai_response: false
      })
      .execute();

    await db.insert(deploymentsTable)
      .values({
        project_id: project.id,
        status: 'pending',
        deployment_url: null,
        build_logs: null
      })
      .execute();

    // Delete the project
    const result = await deleteProject(project.id, user.id);

    expect(result).toBe(true);

    // Verify all associated data is cleaned up
    const [
      remainingProjects,
      remainingFiles,
      remainingMessages,
      remainingDeployments
    ] = await Promise.all([
      db.select().from(projectsTable).where(eq(projectsTable.id, project.id)).execute(),
      db.select().from(filesTable).where(eq(filesTable.project_id, project.id)).execute(),
      db.select().from(chatMessagesTable).where(eq(chatMessagesTable.project_id, project.id)).execute(),
      db.select().from(deploymentsTable).where(eq(deploymentsTable.project_id, project.id)).execute()
    ]);

    expect(remainingProjects).toHaveLength(0);
    expect(remainingFiles).toHaveLength(0);
    expect(remainingMessages).toHaveLength(0);
    expect(remainingDeployments).toHaveLength(0);
  });
});