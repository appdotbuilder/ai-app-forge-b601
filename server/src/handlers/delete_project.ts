import { db } from '../db';
import { projectsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteProject(projectId: number, userId: number): Promise<boolean> {
  try {
    // First verify that the project exists and belongs to the user
    const existingProjects = await db.select()
      .from(projectsTable)
      .where(and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.user_id, userId)
      ))
      .execute();

    if (existingProjects.length === 0) {
      return false; // Project not found or doesn't belong to user
    }

    // Delete the project (cascade delete will handle associated data)
    const result = await db.delete(projectsTable)
      .where(and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.user_id, userId)
      ))
      .execute();

    // Return true if a row was actually deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Project deletion failed:', error);
    throw error;
  }
}