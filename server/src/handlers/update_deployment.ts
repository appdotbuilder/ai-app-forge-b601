import { db } from '../db';
import { deploymentsTable } from '../db/schema';
import { type UpdateDeploymentInput, type Deployment } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDeployment = async (input: UpdateDeploymentInput): Promise<Deployment> => {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<typeof deploymentsTable.$inferInsert> = {};
    
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    
    if (input.deployment_url !== undefined) {
      updateData.deployment_url = input.deployment_url;
    }
    
    if (input.build_logs !== undefined) {
      updateData.build_logs = input.build_logs;
    }
    
    if (input.completed_at !== undefined) {
      updateData.completed_at = input.completed_at;
    }

    // Update deployment record
    const result = await db.update(deploymentsTable)
      .set(updateData)
      .where(eq(deploymentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Deployment with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Deployment update failed:', error);
    throw error;
  }
};