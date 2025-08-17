import { db } from '../db';
import { projectsTable, usersTable } from '../db/schema';
import { type CreateProjectInput, type Project } from '../schema';
import { eq } from 'drizzle-orm';

export const createProject = async (input: CreateProjectInput): Promise<Project> => {
  try {
    // Verify user exists to prevent foreign key constraint violations
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Generate unique slug from project name
    const baseSlug = input.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (true) {
      const existingProject = await db.select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.slug, slug))
        .execute();

      if (existingProject.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Insert project record
    const result = await db.insert(projectsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        description: input.description,
        ai_prompt: input.ai_prompt,
        slug: slug,
        is_deployed: false,
        deployment_url: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Project creation failed:', error);
    throw error;
  }
};