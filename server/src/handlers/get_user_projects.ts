import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type Project } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserProjects = async (userId: number): Promise<Project[]> => {
  try {
    // Query projects for the specified user, ordered by creation date (newest first)
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.user_id, userId))
      .orderBy(desc(projectsTable.created_at))
      .execute();

    // Return results - no numeric conversions needed for this table
    return results;
  } catch (error) {
    console.error('Failed to fetch user projects:', error);
    throw error;
  }
};