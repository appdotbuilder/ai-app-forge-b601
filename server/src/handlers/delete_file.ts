import { db } from '../db';
import { filesTable } from '../db/schema';
import { eq, and, like } from 'drizzle-orm';

export async function deleteFile(fileId: number, projectId: number): Promise<boolean> {
  try {
    // First, get the file to check if it exists and is in the correct project
    const files = await db.select()
      .from(filesTable)
      .where(and(
        eq(filesTable.id, fileId),
        eq(filesTable.project_id, projectId)
      ))
      .execute();

    if (files.length === 0) {
      return false; // File not found or doesn't belong to the project
    }

    const file = files[0];

    // If it's a folder, delete all child files first
    if (file.is_folder) {
      // Delete all files that have this folder's path as a prefix
      // Use LIKE with the folder path followed by '%' to match all children
      const folderPath = file.path.endsWith('/') ? file.path : file.path + '/';
      
      await db.delete(filesTable)
        .where(and(
          eq(filesTable.project_id, projectId),
          like(filesTable.path, `${folderPath}%`)
        ))
        .execute();
    }

    // Delete the file/folder itself
    const deleteResult = await db.delete(filesTable)
      .where(and(
        eq(filesTable.id, fileId),
        eq(filesTable.project_id, projectId)
      ))
      .execute();

    return (deleteResult.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('File deletion failed:', error);
    throw error;
  }
}