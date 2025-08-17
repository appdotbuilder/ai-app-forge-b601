import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type UpdateProjectInput, type Project } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProject = async (input: UpdateProjectInput): Promise<Project> => {
  try {
    // First, verify the project exists
    const existingProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.id))
      .execute();

    if (existingProject.length === 0) {
      throw new Error(`Project with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof projectsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
      // Update slug when name changes
      updateData.slug = input.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.ai_prompt !== undefined) {
      updateData.ai_prompt = input.ai_prompt;
    }

    if (input.is_deployed !== undefined) {
      updateData.is_deployed = input.is_deployed;
    }

    if (input.deployment_url !== undefined) {
      updateData.deployment_url = input.deployment_url;
    }

    // Update the project
    const result = await db.update(projectsTable)
      .set(updateData)
      .where(eq(projectsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Project update failed:', error);
    throw error;
  }
};