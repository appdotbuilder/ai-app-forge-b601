import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, usersTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test user before each test that needs one
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        name: 'Test User'
      })
      .returning()
      .execute();
    return result[0];
  };

  const testInput: CreateProjectInput = {
    user_id: 1,
    name: 'Test Project',
    description: 'A project for testing',
    ai_prompt: 'Create a simple web application'
  };

  it('should create a project successfully', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createProject(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.name).toEqual('Test Project');
    expect(result.description).toEqual('A project for testing');
    expect(result.ai_prompt).toEqual('Create a simple web application');
    expect(result.slug).toEqual('test-project');
    expect(result.is_deployed).toEqual(false);
    expect(result.deployment_url).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save project to database', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createProject(input);

    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Test Project');
    expect(projects[0].slug).toEqual('test-project');
    expect(projects[0].user_id).toEqual(user.id);
    expect(projects[0].is_deployed).toEqual(false);
    expect(projects[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate unique slugs for duplicate names', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    // Create first project
    const result1 = await createProject(input);
    expect(result1.slug).toEqual('test-project');

    // Create second project with same name
    const result2 = await createProject(input);
    expect(result2.slug).toEqual('test-project-1');

    // Create third project with same name
    const result3 = await createProject(input);
    expect(result3.slug).toEqual('test-project-2');

    // Verify all projects exist in database
    const allProjects = await db.select()
      .from(projectsTable)
      .execute();

    expect(allProjects).toHaveLength(3);
    expect(allProjects.map(p => p.slug).sort()).toEqual([
      'test-project',
      'test-project-1', 
      'test-project-2'
    ]);
  });

  it('should handle special characters in project names', async () => {
    const user = await createTestUser();
    const input: CreateProjectInput = {
      user_id: user.id,
      name: 'My Awesome App! #2024 (v2.0)',
      description: 'Special characters test',
      ai_prompt: 'Create an app'
    };

    const result = await createProject(input);

    expect(result.slug).toEqual('my-awesome-app-2024-v2-0');
    expect(result.name).toEqual('My Awesome App! #2024 (v2.0)');
  });

  it('should handle empty description', async () => {
    const user = await createTestUser();
    const input: CreateProjectInput = {
      user_id: user.id,
      name: 'Test Project',
      description: null,
      ai_prompt: 'Create something'
    };

    const result = await createProject(input);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Test Project');
  });

  it('should handle projects with multiple spaces and dashes', async () => {
    const user = await createTestUser();
    const input: CreateProjectInput = {
      user_id: user.id,
      name: '  Multiple   Spaces  --  And   Dashes  ',
      description: 'Testing edge cases',
      ai_prompt: 'Test slug generation'
    };

    const result = await createProject(input);

    expect(result.slug).toEqual('multiple-spaces-and-dashes');
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...testInput, user_id: 99999 };

    await expect(createProject(input)).rejects.toThrow(/User with ID 99999 does not exist/i);
  });

  it('should handle projects with numbers and mixed case', async () => {
    const user = await createTestUser();
    const input: CreateProjectInput = {
      user_id: user.id,
      name: 'Project 123 ABC xyz',
      description: 'Mixed case and numbers',
      ai_prompt: 'Create a numbered project'
    };

    const result = await createProject(input);

    expect(result.slug).toEqual('project-123-abc-xyz');
    expect(result.name).toEqual('Project 123 ABC xyz');
  });
});