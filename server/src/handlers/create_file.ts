import { db } from '../db';
import { filesTable, projectsTable } from '../db/schema';
import { type CreateFileInput, type File } from '../schema';
import { eq } from 'drizzle-orm';

export const createFile = async (input: CreateFileInput): Promise<File> => {
  try {
    // Verify that the project exists
    const project = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.project_id))
      .execute();

    if (project.length === 0) {
      throw new Error(`Project with id ${input.project_id} not found`);
    }

    // Insert the file record
    const result = await db.insert(filesTable)
      .values({
        project_id: input.project_id,
        path: input.path,
        name: input.name,
        content: input.content,
        is_folder: input.is_folder,
        parent_path: input.parent_path
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('File creation failed:', error);
    throw error;
  }
};