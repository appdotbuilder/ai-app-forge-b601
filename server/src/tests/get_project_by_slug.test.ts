import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { getProjectBySlug } from '../handlers/get_project_by_slug';

describe('getProjectBySlug', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a project when found by slug', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create a test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUser.id,
        name: 'Test Project',
        description: 'A test project',
        ai_prompt: 'Create a simple app',
        slug: 'test-project-slug',
        is_deployed: false,
        deployment_url: null
      })
      .returning()
      .execute();

    const testProject = projectResult[0];

    // Test the handler
    const result = await getProjectBySlug('test-project-slug');

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(testProject.id);
    expect(result?.name).toEqual('Test Project');
    expect(result?.description).toEqual('A test project');
    expect(result?.ai_prompt).toEqual('Create a simple app');
    expect(result?.slug).toEqual('test-project-slug');
    expect(result?.user_id).toEqual(testUser.id);
    expect(result?.is_deployed).toEqual(false);
    expect(result?.deployment_url).toBeNull();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when project is not found', async () => {
    const result = await getProjectBySlug('non-existent-slug');
    
    expect(result).toBeNull();
  });

  it('should return the correct project when multiple projects exist', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create multiple projects
    await db.insert(projectsTable)
      .values([
        {
          user_id: testUser.id,
          name: 'First Project',
          description: 'First test project',
          ai_prompt: 'Create first app',
          slug: 'first-project',
          is_deployed: false,
          deployment_url: null
        },
        {
          user_id: testUser.id,
          name: 'Second Project',
          description: 'Second test project',
          ai_prompt: 'Create second app',
          slug: 'second-project',
          is_deployed: true,
          deployment_url: 'https://example.com'
        }
      ])
      .execute();

    // Test getting the second project specifically
    const result = await getProjectBySlug('second-project');

    expect(result).not.toBeNull();
    expect(result?.name).toEqual('Second Project');
    expect(result?.description).toEqual('Second test project');
    expect(result?.slug).toEqual('second-project');
    expect(result?.is_deployed).toEqual(true);
    expect(result?.deployment_url).toEqual('https://example.com');
  });

  it('should handle deployed project with deployment URL', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create a deployed project
    await db.insert(projectsTable)
      .values({
        user_id: testUser.id,
        name: 'Deployed Project',
        description: 'A deployed project',
        ai_prompt: 'Create a deployed app',
        slug: 'deployed-project',
        is_deployed: true,
        deployment_url: 'https://deployed-app.com'
      })
      .execute();

    const result = await getProjectBySlug('deployed-project');

    expect(result).not.toBeNull();
    expect(result?.name).toEqual('Deployed Project');
    expect(result?.is_deployed).toEqual(true);
    expect(result?.deployment_url).toEqual('https://deployed-app.com');
  });

  it('should handle project with null description', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create a project with null description
    await db.insert(projectsTable)
      .values({
        user_id: testUser.id,
        name: 'No Description Project',
        description: null,
        ai_prompt: 'Create an app without description',
        slug: 'no-desc-project',
        is_deployed: false,
        deployment_url: null
      })
      .execute();

    const result = await getProjectBySlug('no-desc-project');

    expect(result).not.toBeNull();
    expect(result?.name).toEqual('No Description Project');
    expect(result?.description).toBeNull();
    expect(result?.slug).toEqual('no-desc-project');
  });
});