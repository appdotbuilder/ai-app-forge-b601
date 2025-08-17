import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable } from '../db/schema';
import { type UpdateProjectInput } from '../schema';
import { updateProject } from '../handlers/update_project';
import { eq } from 'drizzle-orm';

describe('updateProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProjectId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Original Project',
        description: 'Original description',
        ai_prompt: 'Original prompt',
        slug: 'original-project',
        is_deployed: false,
        deployment_url: null
      })
      .returning()
      .execute();

    testProjectId = projectResult[0].id;
  });

  it('should update project name and generate new slug', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      name: 'Updated Project Name'
    };

    const result = await updateProject(input);

    expect(result.id).toEqual(testProjectId);
    expect(result.name).toEqual('Updated Project Name');
    expect(result.slug).toEqual('updated-project-name');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.ai_prompt).toEqual('Original prompt'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update description', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      description: 'Updated description'
    };

    const result = await updateProject(input);

    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual('Original Project'); // Should remain unchanged
  });

  it('should update description to null', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      description: null
    };

    const result = await updateProject(input);

    expect(result.description).toBeNull();
  });

  it('should update ai_prompt', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      ai_prompt: 'New AI prompt for testing'
    };

    const result = await updateProject(input);

    expect(result.ai_prompt).toEqual('New AI prompt for testing');
    expect(result.name).toEqual('Original Project'); // Should remain unchanged
  });

  it('should update deployment status', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      is_deployed: true,
      deployment_url: 'https://example.com/deployed'
    };

    const result = await updateProject(input);

    expect(result.is_deployed).toBe(true);
    expect(result.deployment_url).toEqual('https://example.com/deployed');
  });

  it('should update deployment_url to null', async () => {
    // First set deployment_url to something
    await db.update(projectsTable)
      .set({ deployment_url: 'https://example.com' })
      .where(eq(projectsTable.id, testProjectId))
      .execute();

    const input: UpdateProjectInput = {
      id: testProjectId,
      deployment_url: null
    };

    const result = await updateProject(input);

    expect(result.deployment_url).toBeNull();
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      name: 'Multi Update Project',
      description: 'Multi update description',
      ai_prompt: 'Multi update prompt',
      is_deployed: true,
      deployment_url: 'https://multi-update.com'
    };

    const result = await updateProject(input);

    expect(result.name).toEqual('Multi Update Project');
    expect(result.slug).toEqual('multi-update-project');
    expect(result.description).toEqual('Multi update description');
    expect(result.ai_prompt).toEqual('Multi update prompt');
    expect(result.is_deployed).toBe(true);
    expect(result.deployment_url).toEqual('https://multi-update.com');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      name: 'Persisted Update',
      description: 'This should persist'
    };

    await updateProject(input);

    // Verify changes were saved to database
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, testProjectId))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Persisted Update');
    expect(projects[0].slug).toEqual('persisted-update');
    expect(projects[0].description).toEqual('This should persist');
  });

  it('should generate proper slugs from complex names', async () => {
    const testCases = [
      { name: 'My Awesome Project!!!', expectedSlug: 'my-awesome-project' },
      { name: 'Project   With    Spaces', expectedSlug: 'project-with-spaces' },
      { name: 'Special@#$%Characters&*()Project', expectedSlug: 'special-characters-project' },
      { name: '@@@Start and End@@@', expectedSlug: 'start-and-end' }
    ];

    for (const testCase of testCases) {
      const input: UpdateProjectInput = {
        id: testProjectId,
        name: testCase.name
      };

      const result = await updateProject(input);
      expect(result.slug).toEqual(testCase.expectedSlug);
    }
  });

  it('should throw error when project does not exist', async () => {
    const input: UpdateProjectInput = {
      id: 99999, // Non-existent ID
      name: 'Should fail'
    };

    await expect(updateProject(input)).rejects.toThrow(/Project with id 99999 not found/);
  });

  it('should update updated_at timestamp even with no field changes', async () => {
    const originalProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, testProjectId))
      .execute();

    const originalUpdatedAt = originalProject[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateProjectInput = {
      id: testProjectId
      // No fields to update, but updated_at should still change
    };

    const result = await updateProject(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});