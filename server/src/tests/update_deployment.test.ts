import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, deploymentsTable } from '../db/schema';
import { type UpdateDeploymentInput } from '../schema';
import { updateDeployment } from '../handlers/update_deployment';
import { eq } from 'drizzle-orm';

describe('updateDeployment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProjectId: number;
  let testDeploymentId: number;

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
        name: 'Test Project',
        description: 'A test project',
        ai_prompt: 'Create a test app',
        slug: 'test-project'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create test deployment
    const deploymentResult = await db.insert(deploymentsTable)
      .values({
        project_id: testProjectId,
        status: 'pending'
      })
      .returning()
      .execute();
    testDeploymentId = deploymentResult[0].id;
  });

  it('should update deployment status', async () => {
    const input: UpdateDeploymentInput = {
      id: testDeploymentId,
      status: 'building'
    };

    const result = await updateDeployment(input);

    expect(result.id).toEqual(testDeploymentId);
    expect(result.status).toEqual('building');
    expect(result.project_id).toEqual(testProjectId);
    expect(result.deployment_url).toBeNull();
    expect(result.build_logs).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update deployment with URL and logs', async () => {
    const input: UpdateDeploymentInput = {
      id: testDeploymentId,
      status: 'deployed',
      deployment_url: 'https://example.com',
      build_logs: 'Build successful',
      completed_at: new Date()
    };

    const result = await updateDeployment(input);

    expect(result.id).toEqual(testDeploymentId);
    expect(result.status).toEqual('deployed');
    expect(result.deployment_url).toEqual('https://example.com');
    expect(result.build_logs).toEqual('Build successful');
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // First, set some initial values
    await db.update(deploymentsTable)
      .set({
        status: 'building',
        build_logs: 'Initial logs'
      })
      .where(eq(deploymentsTable.id, testDeploymentId))
      .execute();

    // Update only status, leaving other fields unchanged
    const input: UpdateDeploymentInput = {
      id: testDeploymentId,
      status: 'deployed'
    };

    const result = await updateDeployment(input);

    expect(result.status).toEqual('deployed');
    expect(result.build_logs).toEqual('Initial logs'); // Should remain unchanged
    expect(result.deployment_url).toBeNull(); // Should remain null
  });

  it('should save changes to database', async () => {
    const input: UpdateDeploymentInput = {
      id: testDeploymentId,
      status: 'failed',
      build_logs: 'Build failed with error'
    };

    await updateDeployment(input);

    // Verify changes were saved
    const deployments = await db.select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, testDeploymentId))
      .execute();

    expect(deployments).toHaveLength(1);
    expect(deployments[0].status).toEqual('failed');
    expect(deployments[0].build_logs).toEqual('Build failed with error');
  });

  it('should handle null values correctly', async () => {
    // First set some values
    await db.update(deploymentsTable)
      .set({
        deployment_url: 'https://temp.com',
        build_logs: 'Some logs'
      })
      .where(eq(deploymentsTable.id, testDeploymentId))
      .execute();

    // Update to null values
    const input: UpdateDeploymentInput = {
      id: testDeploymentId,
      deployment_url: null,
      build_logs: null
    };

    const result = await updateDeployment(input);

    expect(result.deployment_url).toBeNull();
    expect(result.build_logs).toBeNull();
  });

  it('should throw error for non-existent deployment', async () => {
    const input: UpdateDeploymentInput = {
      id: 99999,
      status: 'deployed'
    };

    await expect(updateDeployment(input)).rejects.toThrow(/not found/i);
  });

  it('should handle deployment progression workflow', async () => {
    // Simulate deployment progression: pending -> building -> deployed
    
    // Step 1: Start building
    const buildingInput: UpdateDeploymentInput = {
      id: testDeploymentId,
      status: 'building',
      build_logs: 'Starting build process...'
    };

    const buildingResult = await updateDeployment(buildingInput);
    expect(buildingResult.status).toEqual('building');
    expect(buildingResult.build_logs).toEqual('Starting build process...');
    expect(buildingResult.completed_at).toBeNull();

    // Step 2: Complete deployment
    const completedAt = new Date();
    const deployedInput: UpdateDeploymentInput = {
      id: testDeploymentId,
      status: 'deployed',
      deployment_url: 'https://deployed-app.com',
      build_logs: 'Build completed successfully',
      completed_at: completedAt
    };

    const deployedResult = await updateDeployment(deployedInput);
    expect(deployedResult.status).toEqual('deployed');
    expect(deployedResult.deployment_url).toEqual('https://deployed-app.com');
    expect(deployedResult.build_logs).toEqual('Build completed successfully');
    expect(deployedResult.completed_at).toBeInstanceOf(Date);
  });
});