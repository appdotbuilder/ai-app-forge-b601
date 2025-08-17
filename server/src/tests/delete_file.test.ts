import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable, projectsTable, usersTable } from '../db/schema';
import { deleteFile } from '../handlers/delete_file';
import { eq, and } from 'drizzle-orm';

describe('deleteFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let projectId: number;
  let otherProjectId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    userId = users[0].id;

    // Create test projects
    const projects = await db.insert(projectsTable)
      .values([
        {
          user_id: userId,
          name: 'Test Project',
          description: 'A test project',
          ai_prompt: 'Create a test app',
          slug: 'test-project'
        },
        {
          user_id: userId,
          name: 'Other Project',
          description: 'Another test project',
          ai_prompt: 'Create another test app',
          slug: 'other-project'
        }
      ])
      .returning()
      .execute();
    projectId = projects[0].id;
    otherProjectId = projects[1].id;
  });

  it('should delete a single file successfully', async () => {
    // Create a test file
    const files = await db.insert(filesTable)
      .values({
        project_id: projectId,
        path: '/src/test.ts',
        name: 'test.ts',
        content: 'console.log("test");',
        is_folder: false,
        parent_path: '/src'
      })
      .returning()
      .execute();

    const fileId = files[0].id;

    // Delete the file
    const result = await deleteFile(fileId, projectId);

    expect(result).toBe(true);

    // Verify file is deleted
    const remainingFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, fileId))
      .execute();

    expect(remainingFiles).toHaveLength(0);
  });

  it('should delete a folder and all its children', async () => {
    // Create folder structure
    const files = await db.insert(filesTable)
      .values([
        {
          project_id: projectId,
          path: '/components',
          name: 'components',
          content: '',
          is_folder: true,
          parent_path: '/'
        },
        {
          project_id: projectId,
          path: '/components/Button.tsx',
          name: 'Button.tsx',
          content: 'export const Button = () => <button></button>;',
          is_folder: false,
          parent_path: '/components'
        },
        {
          project_id: projectId,
          path: '/components/Input.tsx',
          name: 'Input.tsx',
          content: 'export const Input = () => <input />;',
          is_folder: false,
          parent_path: '/components'
        },
        {
          project_id: projectId,
          path: '/components/nested',
          name: 'nested',
          content: '',
          is_folder: true,
          parent_path: '/components'
        },
        {
          project_id: projectId,
          path: '/components/nested/Deep.tsx',
          name: 'Deep.tsx',
          content: 'export const Deep = () => <div>deep</div>;',
          is_folder: false,
          parent_path: '/components/nested'
        },
        {
          project_id: projectId,
          path: '/other.ts',
          name: 'other.ts',
          content: 'console.log("should remain");',
          is_folder: false,
          parent_path: '/'
        }
      ])
      .returning()
      .execute();

    const folderId = files[0].id; // components folder

    // Delete the folder
    const result = await deleteFile(folderId, projectId);

    expect(result).toBe(true);

    // Verify all files in the folder are deleted
    const remainingFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, projectId))
      .execute();

    expect(remainingFiles).toHaveLength(1);
    expect(remainingFiles[0].name).toBe('other.ts');
  });

  it('should return false when file does not exist', async () => {
    const result = await deleteFile(99999, projectId);
    expect(result).toBe(false);
  });

  it('should return false when file belongs to different project', async () => {
    // Create a file in other project
    const files = await db.insert(filesTable)
      .values({
        project_id: otherProjectId,
        path: '/secret.ts',
        name: 'secret.ts',
        content: 'const secret = "hidden";',
        is_folder: false,
        parent_path: '/'
      })
      .returning()
      .execute();

    const fileId = files[0].id;

    // Try to delete it using wrong project ID
    const result = await deleteFile(fileId, projectId);

    expect(result).toBe(false);

    // Verify file still exists
    const remainingFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, fileId))
      .execute();

    expect(remainingFiles).toHaveLength(1);
  });

  it('should handle folder paths with and without trailing slashes', async () => {
    // Create folder with path not ending in slash
    const files = await db.insert(filesTable)
      .values([
        {
          project_id: projectId,
          path: '/utils',
          name: 'utils',
          content: '',
          is_folder: true,
          parent_path: '/'
        },
        {
          project_id: projectId,
          path: '/utils/helper.ts',
          name: 'helper.ts',
          content: 'export const help = () => {};',
          is_folder: false,
          parent_path: '/utils'
        }
      ])
      .returning()
      .execute();

    const folderId = files[0].id;

    // Delete the folder
    const result = await deleteFile(folderId, projectId);

    expect(result).toBe(true);

    // Verify both folder and child are deleted
    const remainingFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, projectId))
      .execute();

    expect(remainingFiles).toHaveLength(0);
  });

  it('should not delete files from other projects when deleting a folder', async () => {
    // Create similar folder structure in both projects
    await db.insert(filesTable)
      .values([
        // Project 1
        {
          project_id: projectId,
          path: '/shared',
          name: 'shared',
          content: '',
          is_folder: true,
          parent_path: '/'
        },
        {
          project_id: projectId,
          path: '/shared/config.ts',
          name: 'config.ts',
          content: 'export const config = {};',
          is_folder: false,
          parent_path: '/shared'
        },
        // Project 2 (other project)
        {
          project_id: otherProjectId,
          path: '/shared',
          name: 'shared',
          content: '',
          is_folder: true,
          parent_path: '/'
        },
        {
          project_id: otherProjectId,
          path: '/shared/config.ts',
          name: 'config.ts',
          content: 'export const otherConfig = {};',
          is_folder: false,
          parent_path: '/shared'
        }
      ])
      .execute();

    // Get the folder ID from project 1
    const project1Files = await db.select()
      .from(filesTable)
      .where(and(
        eq(filesTable.project_id, projectId),
        eq(filesTable.is_folder, true),
        eq(filesTable.name, 'shared')
      ))
      .execute();

    const folderId = project1Files[0].id;

    // Delete the folder from project 1
    const result = await deleteFile(folderId, projectId);

    expect(result).toBe(true);

    // Verify project 1 files are deleted
    const project1Remaining = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, projectId))
      .execute();

    expect(project1Remaining).toHaveLength(0);

    // Verify project 2 files are untouched
    const project2Remaining = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, otherProjectId))
      .execute();

    expect(project2Remaining).toHaveLength(2);
  });

  it('should handle empty folders correctly', async () => {
    // Create empty folder
    const files = await db.insert(filesTable)
      .values({
        project_id: projectId,
        path: '/empty',
        name: 'empty',
        content: '',
        is_folder: true,
        parent_path: '/'
      })
      .returning()
      .execute();

    const folderId = files[0].id;

    // Delete the empty folder
    const result = await deleteFile(folderId, projectId);

    expect(result).toBe(true);

    // Verify folder is deleted
    const remainingFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, projectId))
      .execute();

    expect(remainingFiles).toHaveLength(0);
  });
});