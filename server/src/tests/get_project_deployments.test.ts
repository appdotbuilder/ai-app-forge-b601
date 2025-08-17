import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, deploymentsTable } from '../db/schema';
import { getProjectDeployments } from '../handlers/get_project_deployments';

describe('getProjectDeployments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for project with no deployments', async () => {
    // Create a user and project
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        user_id: user[0].id,
        name: 'Test Project',
        description: 'A test project',
        ai_prompt: 'Create a simple app',
        slug: 'test-project',
        is_deployed: false
      })
      .returning()
      .execute();

    const result = await getProjectDeployments(project[0].id);

    expect(result).toEqual([]);
  });

  it('should return deployments for a project ordered by newest first', async () => {
    // Create a user and project
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        user_id: user[0].id,
        name: 'Test Project',
        description: 'A test project',
        ai_prompt: 'Create a simple app',
        slug: 'test-project',
        is_deployed: true,
        deployment_url: 'https://example.com'
      })
      .returning()
      .execute();

    // Create deployments at different times
    const deployment1 = await db.insert(deploymentsTable)
      .values({
        project_id: project[0].id,
        status: 'deployed',
        deployment_url: 'https://v1.example.com',
        build_logs: 'Build completed successfully'
      })
      .returning()
      .execute();

    // Wait a tiny bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const deployment2 = await db.insert(deploymentsTable)
      .values({
        project_id: project[0].id,
        status: 'building',
        build_logs: 'Building application...'
      })
      .returning()
      .execute();

    const result = await getProjectDeployments(project[0].id);

    expect(result).toHaveLength(2);
    // Should be ordered by newest first (deployment2 then deployment1)
    expect(result[0].id).toEqual(deployment2[0].id);
    expect(result[1].id).toEqual(deployment1[0].id);
    
    // Verify deployment data
    expect(result[0].project_id).toEqual(project[0].id);
    expect(result[0].status).toEqual('building');
    expect(result[0].deployment_url).toBeNull();
    expect(result[0].build_logs).toEqual('Building application...');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].completed_at).toBeNull();

    expect(result[1].project_id).toEqual(project[0].id);
    expect(result[1].status).toEqual('deployed');
    expect(result[1].deployment_url).toEqual('https://v1.example.com');
    expect(result[1].build_logs).toEqual('Build completed successfully');
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should return only deployments for specified project', async () => {
    // Create users and projects
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User One'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User Two'
      })
      .returning()
      .execute();

    const project1 = await db.insert(projectsTable)
      .values({
        user_id: user1[0].id,
        name: 'Project One',
        description: 'First project',
        ai_prompt: 'Create app one',
        slug: 'project-one',
        is_deployed: true
      })
      .returning()
      .execute();

    const project2 = await db.insert(projectsTable)
      .values({
        user_id: user2[0].id,
        name: 'Project Two',
        description: 'Second project',
        ai_prompt: 'Create app two',
        slug: 'project-two',
        is_deployed: true
      })
      .returning()
      .execute();

    // Create deployments for both projects
    await db.insert(deploymentsTable)
      .values({
        project_id: project1[0].id,
        status: 'deployed',
        deployment_url: 'https://project1.com'
      });

    await db.insert(deploymentsTable)
      .values({
        project_id: project2[0].id,
        status: 'deployed',
        deployment_url: 'https://project2.com'
      });

    // Get deployments for project1 only
    const result = await getProjectDeployments(project1[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toEqual(project1[0].id);
    expect(result[0].deployment_url).toEqual('https://project1.com');
  });

  it('should handle projects with multiple deployment statuses', async () => {
    // Create a user and project
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        user_id: user[0].id,
        name: 'Multi Status Project',
        description: 'Project with various deployment statuses',
        ai_prompt: 'Create a complex app',
        slug: 'multi-status-project',
        is_deployed: true
      })
      .returning()
      .execute();

    // Create deployments with different statuses
    await db.insert(deploymentsTable)
      .values([
        {
          project_id: project[0].id,
          status: 'pending'
        },
        {
          project_id: project[0].id,
          status: 'building',
          build_logs: 'Starting build process...'
        },
        {
          project_id: project[0].id,
          status: 'deployed',
          deployment_url: 'https://success.example.com',
          build_logs: 'Deployment successful',
          completed_at: new Date()
        },
        {
          project_id: project[0].id,
          status: 'failed',
          build_logs: 'Build failed with errors',
          completed_at: new Date()
        }
      ]);

    const result = await getProjectDeployments(project[0].id);

    expect(result).toHaveLength(4);
    
    // Verify all statuses are represented
    const statuses = result.map(d => d.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('building');
    expect(statuses).toContain('deployed');
    expect(statuses).toContain('failed');

    // Verify they are ordered by creation date (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }
  });

  it('should return empty array for non-existent project', async () => {
    const result = await getProjectDeployments(99999);
    expect(result).toEqual([]);
  });
});