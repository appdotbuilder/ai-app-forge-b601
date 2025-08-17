import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { getUserProjects } from '../handlers/get_user_projects';

// Test data
const testUser1 = {
  email: 'user1@test.com',
  password_hash: 'hashed_password_1',
  name: 'Test User 1'
};

const testUser2 = {
  email: 'user2@test.com',
  password_hash: 'hashed_password_2',
  name: 'Test User 2'
};

const createTestProject = (userId: number, name: string, aiPrompt: string) => ({
  user_id: userId,
  name,
  description: `Description for ${name}`,
  ai_prompt: aiPrompt,
  slug: name.toLowerCase().replace(/\s+/g, '-')
});

describe('getUserProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return projects for a specific user', async () => {
    // Create test users
    const [user1, user2] = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    // Create projects for user1
    const projectsData = [
      createTestProject(user1.id, 'First Project', 'Create a simple web app'),
      createTestProject(user1.id, 'Second Project', 'Build a React dashboard')
    ];

    // Create one project for user2 to ensure filtering works
    const user2Project = createTestProject(user2.id, 'User2 Project', 'Build an API');

    await db.insert(projectsTable)
      .values([...projectsData, user2Project])
      .execute();

    // Get projects for user1
    const result = await getUserProjects(user1.id);

    // Should return only user1's projects
    expect(result).toHaveLength(2);
    result.forEach(project => {
      expect(project.user_id).toEqual(user1.id);
      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(project.ai_prompt).toBeDefined();
      expect(project.slug).toBeDefined();
      expect(project.created_at).toBeInstanceOf(Date);
      expect(project.updated_at).toBeInstanceOf(Date);
      expect(typeof project.is_deployed).toBe('boolean');
    });

    // Check that projects are from user1, not user2
    const projectNames = result.map(p => p.name);
    expect(projectNames).toContain('First Project');
    expect(projectNames).toContain('Second Project');
    expect(projectNames).not.toContain('User2 Project');
  });

  it('should return projects ordered by creation date (newest first)', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    // Create projects with slight delays to ensure different timestamps
    const project1 = createTestProject(user.id, 'Older Project', 'First prompt');
    await db.insert(projectsTable).values([project1]).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const project2 = createTestProject(user.id, 'Newer Project', 'Second prompt');
    await db.insert(projectsTable).values([project2]).execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const project3 = createTestProject(user.id, 'Newest Project', 'Third prompt');
    await db.insert(projectsTable).values([project3]).execute();

    const result = await getUserProjects(user.id);

    // Should have 3 projects
    expect(result).toHaveLength(3);

    // Should be ordered by creation date (newest first)
    expect(result[0].name).toEqual('Newest Project');
    expect(result[1].name).toEqual('Newer Project');
    expect(result[2].name).toEqual('Older Project');

    // Verify dates are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should return empty array for user with no projects', async () => {
    // Create user but no projects
    const [user] = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const result = await getUserProjects(user.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    // Try to get projects for a user ID that doesn't exist
    const result = await getUserProjects(99999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should include all project fields correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    // Create a project with all possible field values
    const projectData = {
      user_id: user.id,
      name: 'Complete Project',
      description: 'A fully detailed project description',
      ai_prompt: 'Create a comprehensive web application with authentication',
      slug: 'complete-project',
      is_deployed: true,
      deployment_url: 'https://example.com'
    };

    await db.insert(projectsTable)
      .values([projectData])
      .execute();

    const result = await getUserProjects(user.id);

    expect(result).toHaveLength(1);
    
    const project = result[0];
    expect(project.user_id).toEqual(user.id);
    expect(project.name).toEqual('Complete Project');
    expect(project.description).toEqual('A fully detailed project description');
    expect(project.ai_prompt).toEqual('Create a comprehensive web application with authentication');
    expect(project.slug).toEqual('complete-project');
    expect(project.is_deployed).toBe(true);
    expect(project.deployment_url).toEqual('https://example.com');
    expect(project.id).toBeDefined();
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);
  });

  it('should handle projects with null optional fields', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    // Create a project with minimal required fields (optional fields will be null)
    const projectData = {
      user_id: user.id,
      name: 'Minimal Project',
      ai_prompt: 'Simple prompt',
      slug: 'minimal-project'
      // description and deployment_url will be null
      // is_deployed defaults to false
    };

    await db.insert(projectsTable)
      .values([projectData])
      .execute();

    const result = await getUserProjects(user.id);

    expect(result).toHaveLength(1);
    
    const project = result[0];
    expect(project.user_id).toEqual(user.id);
    expect(project.name).toEqual('Minimal Project');
    expect(project.description).toBeNull();
    expect(project.ai_prompt).toEqual('Simple prompt');
    expect(project.slug).toEqual('minimal-project');
    expect(project.is_deployed).toBe(false);
    expect(project.deployment_url).toBeNull();
    expect(project.id).toBeDefined();
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);
  });
});