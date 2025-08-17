import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type Project } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, slug))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Failed to get project by slug:', error);
    throw error;
  }
}