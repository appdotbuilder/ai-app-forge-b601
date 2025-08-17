import { db } from '../db';
import { deploymentsTable } from '../db/schema';
import { type Deployment } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getProjectDeployments(projectId: number): Promise<Deployment[]> {
  try {
    // Fetch all deployments for the specific project, ordered by creation date (newest first)
    const results = await db.select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.project_id, projectId))
      .orderBy(desc(deploymentsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch project deployments:', error);
    throw error;
  }
}