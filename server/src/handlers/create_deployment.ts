import { db } from '../db';
import { deploymentsTable, projectsTable } from '../db/schema';
import { type CreateDeploymentInput, type Deployment } from '../schema';
import { eq } from 'drizzle-orm';

export const createDeployment = async (input: CreateDeploymentInput): Promise<Deployment> => {
  try {
    // Verify that the project exists first to prevent foreign key constraint violations
    const existingProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.project_id))
      .limit(1)
      .execute();

    if (existingProject.length === 0) {
      throw new Error(`Project with ID ${input.project_id} not found`);
    }

    // Create deployment record with 'pending' status
    const result = await db.insert(deploymentsTable)
      .values({
        project_id: input.project_id,
        status: 'pending' as const,
        deployment_url: null,
        build_logs: null,
        completed_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Deployment creation failed:', error);
    throw error;
  }
};