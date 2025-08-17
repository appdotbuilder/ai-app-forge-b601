import { db } from '../db';
import { filesTable } from '../db/schema';
import { type File } from '../schema';
import { eq } from 'drizzle-orm';

export const getProjectFiles = async (projectId: number): Promise<File[]> => {
  try {
    // Fetch all files and folders for the given project
    const results = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, projectId))
      .execute();

    // Return the files as-is since no numeric conversion is needed
    // All fields are already in the correct format
    return results;
  } catch (error) {
    console.error('Failed to get project files:', error);
    throw error;
  }
};