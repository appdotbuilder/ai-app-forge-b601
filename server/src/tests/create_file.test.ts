import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable, usersTable, projectsTable } from '../db/schema';
import { type CreateFileInput } from '../schema';
import { createFile } from '../handlers/create_file';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  name: 'Test User'
};

// Test project data
const testProject = {
  name: 'Test Project',
  description: 'A test project',
  ai_prompt: 'Create a simple app',
  slug: 'test-project-slug'
};

describe('createFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let projectId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userId
      })
      .returning()
      .execute();
    projectId = projectResult[0].id;
  });

  it('should create a file successfully', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/src/app.js',
      name: 'app.js',
      content: 'console.log("Hello world");',
      is_folder: false,
      parent_path: '/src'
    };

    const result = await createFile(testInput);

    // Validate returned data
    expect(result.id).toBeDefined();
    expect(result.project_id).toEqual(projectId);
    expect(result.path).toEqual('/src/app.js');
    expect(result.name).toEqual('app.js');
    expect(result.content).toEqual('console.log("Hello world");');
    expect(result.is_folder).toEqual(false);
    expect(result.parent_path).toEqual('/src');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a folder successfully', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/src/components',
      name: 'components',
      content: '',
      is_folder: true,
      parent_path: '/src'
    };

    const result = await createFile(testInput);

    // Validate returned data
    expect(result.project_id).toEqual(projectId);
    expect(result.path).toEqual('/src/components');
    expect(result.name).toEqual('components');
    expect(result.content).toEqual('');
    expect(result.is_folder).toEqual(true);
    expect(result.parent_path).toEqual('/src');
  });

  it('should use default values correctly', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/README.md',
      name: 'README.md',
      content: '', // Explicitly provide default value
      is_folder: false, // Explicitly provide default value
      parent_path: null
    };

    const result = await createFile(testInput);

    expect(result.content).toEqual('');
    expect(result.is_folder).toEqual(false);
    expect(result.parent_path).toBeNull();
  });

  it('should save file to database correctly', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/package.json',
      name: 'package.json',
      content: '{"name": "test-app"}',
      is_folder: false,
      parent_path: null
    };

    const result = await createFile(testInput);

    // Query database to verify file was saved
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    expect(files).toHaveLength(1);
    const savedFile = files[0];
    expect(savedFile.project_id).toEqual(projectId);
    expect(savedFile.path).toEqual('/package.json');
    expect(savedFile.name).toEqual('package.json');
    expect(savedFile.content).toEqual('{"name": "test-app"}');
    expect(savedFile.is_folder).toEqual(false);
    expect(savedFile.parent_path).toBeNull();
    expect(savedFile.created_at).toBeInstanceOf(Date);
    expect(savedFile.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null parent_path correctly', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/index.html',
      name: 'index.html',
      content: '<html><body>Hello</body></html>',
      is_folder: false,
      parent_path: null
    };

    const result = await createFile(testInput);

    expect(result.parent_path).toBeNull();

    // Verify in database
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    expect(files[0].parent_path).toBeNull();
  });

  it('should throw error when project does not exist', async () => {
    const testInput: CreateFileInput = {
      project_id: 99999, // Non-existent project ID
      path: '/test.js',
      name: 'test.js',
      content: 'test content',
      is_folder: false,
      parent_path: null
    };

    await expect(createFile(testInput)).rejects.toThrow(/Project with id 99999 not found/);
  });

  it('should handle complex file paths and nested structures', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/src/components/ui/Button.tsx',
      name: 'Button.tsx',
      content: 'export const Button = () => <button>Click me</button>;',
      is_folder: false,
      parent_path: '/src/components/ui'
    };

    const result = await createFile(testInput);

    expect(result.path).toEqual('/src/components/ui/Button.tsx');
    expect(result.name).toEqual('Button.tsx');
    expect(result.parent_path).toEqual('/src/components/ui');
  });

  it('should handle empty content for files', async () => {
    const testInput: CreateFileInput = {
      project_id: projectId,
      path: '/empty.txt',
      name: 'empty.txt',
      content: '',
      is_folder: false,
      parent_path: null
    };

    const result = await createFile(testInput);

    expect(result.content).toEqual('');
  });
});