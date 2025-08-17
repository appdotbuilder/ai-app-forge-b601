import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable, usersTable, projectsTable } from '../db/schema';
import { type UpdateFileInput } from '../schema';
import { updateFile } from '../handlers/update_file';
import { eq } from 'drizzle-orm';

describe('updateFile', () => {
  let testUserId: number;
  let testProjectId: number;
  let testFileId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Test Project',
        description: 'A test project',
        ai_prompt: 'Create a test app',
        slug: 'test-project'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create test file
    const fileResult = await db.insert(filesTable)
      .values({
        project_id: testProjectId,
        path: '/src/test.js',
        name: 'test.js',
        content: 'console.log("Hello World");',
        is_folder: false,
        parent_path: '/src'
      })
      .returning()
      .execute();
    testFileId = fileResult[0].id;
  });

  afterEach(resetDB);

  it('should update file name only', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      name: 'updated-test.js'
    };

    const result = await updateFile(input);

    expect(result.id).toEqual(testFileId);
    expect(result.name).toEqual('updated-test.js');
    expect(result.content).toEqual('console.log("Hello World");'); // Should remain unchanged
    expect(result.path).toEqual('/src/test.js'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update file content only', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      content: 'console.log("Updated content");'
    };

    const result = await updateFile(input);

    expect(result.id).toEqual(testFileId);
    expect(result.name).toEqual('test.js'); // Should remain unchanged
    expect(result.content).toEqual('console.log("Updated content");');
    expect(result.path).toEqual('/src/test.js'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update file path only', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      path: '/lib/test.js'
    };

    const result = await updateFile(input);

    expect(result.id).toEqual(testFileId);
    expect(result.name).toEqual('test.js'); // Should remain unchanged
    expect(result.content).toEqual('console.log("Hello World");'); // Should remain unchanged
    expect(result.path).toEqual('/lib/test.js');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      name: 'app.js',
      content: 'const app = "Hello World";',
      path: '/src/app.js'
    };

    const result = await updateFile(input);

    expect(result.id).toEqual(testFileId);
    expect(result.name).toEqual('app.js');
    expect(result.content).toEqual('const app = "Hello World";');
    expect(result.path).toEqual('/src/app.js');
    expect(result.project_id).toEqual(testProjectId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update file in database', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      name: 'database-test.js',
      content: 'Updated database content'
    };

    await updateFile(input);

    // Verify changes were persisted in database
    const dbFile = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, testFileId))
      .execute();

    expect(dbFile).toHaveLength(1);
    expect(dbFile[0].name).toEqual('database-test.js');
    expect(dbFile[0].content).toEqual('Updated database content');
    expect(dbFile[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty content update', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      content: ''
    };

    const result = await updateFile(input);

    expect(result.content).toEqual('');
    expect(result.name).toEqual('test.js'); // Should remain unchanged
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalFile = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, testFileId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateFileInput = {
      id: testFileId,
      name: 'timestamp-test.js'
    };

    const result = await updateFile(input);

    expect(result.updated_at > originalFile[0].updated_at).toBe(true);
  });

  it('should throw error for non-existent file', async () => {
    const input: UpdateFileInput = {
      id: 99999,
      name: 'non-existent.js'
    };

    await expect(updateFile(input)).rejects.toThrow(/File with id 99999 not found/);
  });

  it('should preserve other file properties', async () => {
    const input: UpdateFileInput = {
      id: testFileId,
      content: 'New content'
    };

    const result = await updateFile(input);

    expect(result.project_id).toEqual(testProjectId);
    expect(result.is_folder).toEqual(false);
    expect(result.parent_path).toEqual('/src');
    expect(result.created_at).toBeInstanceOf(Date);
  });
});