import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { deploymentsTable, projectsTable, usersTable } from '../db/schema';
import { type CreateDeploymentInput } from '../schema';
import { createDeployment } from '../handlers/create_deployment';
import { eq } from 'drizzle-orm';

describe('createDeployment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a deployment with pending status', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        description: 'A test project for deployment',
        ai_prompt: 'Create a test app',
        slug: 'test-project'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    const testInput: CreateDeploymentInput = {
      project_id: projectId
    };

    const result = await createDeployment(testInput);

    // Verify deployment properties
    expect(result.project_id).toEqual(projectId);
    expect(result.status).toEqual('pending');
    expect(result.deployment_url).toBeNull();
    expect(result.build_logs).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save deployment to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        description: 'A test project for deployment',
        ai_prompt: 'Create a test app',
        slug: 'test-project'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    const testInput: CreateDeploymentInput = {
      project_id: projectId
    };

    const result = await createDeployment(testInput);

    // Query database to verify the deployment was saved
    const deployments = await db.select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, result.id))
      .execute();

    expect(deployments).toHaveLength(1);
    expect(deployments[0].project_id).toEqual(projectId);
    expect(deployments[0].status).toEqual('pending');
    expect(deployments[0].deployment_url).toBeNull();
    expect(deployments[0].build_logs).toBeNull();
    expect(deployments[0].completed_at).toBeNull();
    expect(deployments[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent project', async () => {
    const testInput: CreateDeploymentInput = {
      project_id: 99999 // Non-existent project ID
    };

    await expect(createDeployment(testInput)).rejects.toThrow(/Project with ID 99999 not found/i);
  });

  it('should create multiple deployments for the same project', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        description: 'A test project for deployment',
        ai_prompt: 'Create a test app',
        slug: 'test-project'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    const testInput: CreateDeploymentInput = {
      project_id: projectId
    };

    // Create first deployment
    const firstDeployment = await createDeployment(testInput);

    // Create second deployment
    const secondDeployment = await createDeployment(testInput);

    // Verify both deployments exist and have different IDs
    expect(firstDeployment.id).not.toEqual(secondDeployment.id);
    expect(firstDeployment.project_id).toEqual(projectId);
    expect(secondDeployment.project_id).toEqual(projectId);
    expect(firstDeployment.status).toEqual('pending');
    expect(secondDeployment.status).toEqual('pending');

    // Verify both are in database
    const deployments = await db.select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.project_id, projectId))
      .execute();

    expect(deployments).toHaveLength(2);
    expect(deployments.map(d => d.id).sort()).toEqual([firstDeployment.id, secondDeployment.id].sort());
  });

  it('should handle database constraint errors gracefully', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        description: 'A test project for deployment',
        ai_prompt: 'Create a test app',
        slug: 'test-project'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    const testInput: CreateDeploymentInput = {
      project_id: projectId
    };

    // First deployment should succeed
    const result = await createDeployment(testInput);
    expect(result.project_id).toEqual(projectId);
    expect(result.status).toEqual('pending');

    // Delete the project to simulate constraint violation scenario
    await db.delete(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    // Attempting to create deployment for deleted project should fail
    await expect(createDeployment(testInput)).rejects.toThrow(/Project with ID \d+ not found/i);
  });
});