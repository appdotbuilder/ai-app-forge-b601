import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, filesTable } from '../db/schema';
import { getProjectFiles } from '../handlers/get_project_files';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  name: 'Test User'
};

const testProject = {
  name: 'Test Project',
  description: 'A test project',
  ai_prompt: 'Create a simple web app',
  slug: 'test-project'
};

const testFiles = [
  {
    path: '/src',
    name: 'src',
    content: '',
    is_folder: true,
    parent_path: null
  },
  {
    path: '/src/index.js',
    name: 'index.js',
    content: 'console.log("Hello World");',
    is_folder: false,
    parent_path: '/src'
  },
  {
    path: '/package.json',
    name: 'package.json',
    content: '{"name": "test-app", "version": "1.0.0"}',
    is_folder: false,
    parent_path: null
  },
  {
    path: '/src/components',
    name: 'components',
    content: '',
    is_folder: true,
    parent_path: '/src'
  },
  {
    path: '/src/components/App.js',
    name: 'App.js',
    content: 'export default function App() { return <div>Hello</div>; }',
    is_folder: false,
    parent_path: '/src/components'
  }
];

describe('getProjectFiles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for project with no files', async () => {
    // Create user and project but no files
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    const result = await getProjectFiles(project.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all files and folders for a project', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create test files
    const createdFiles = await db.insert(filesTable)
      .values(testFiles.map(file => ({
        ...file,
        project_id: project.id
      })))
      .returning()
      .execute();

    const result = await getProjectFiles(project.id);

    expect(result).toHaveLength(5);
    
    // Verify all files are returned
    const filenames = result.map(file => file.name).sort();
    expect(filenames).toEqual(['App.js', 'components', 'index.js', 'package.json', 'src']);

    // Verify structure includes both files and folders
    const folders = result.filter(file => file.is_folder);
    const files = result.filter(file => !file.is_folder);
    
    expect(folders).toHaveLength(2); // src and components folders
    expect(files).toHaveLength(3); // index.js, package.json, App.js
  });

  it('should return files with correct properties', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create a single test file
    const singleFile = testFiles[1]; // index.js file
    await db.insert(filesTable)
      .values({
        ...singleFile,
        project_id: project.id
      })
      .execute();

    const result = await getProjectFiles(project.id);

    expect(result).toHaveLength(1);
    const file = result[0];

    // Verify all expected properties exist
    expect(file.id).toBeDefined();
    expect(file.project_id).toEqual(project.id);
    expect(file.path).toEqual('/src/index.js');
    expect(file.name).toEqual('index.js');
    expect(file.content).toEqual('console.log("Hello World");');
    expect(file.is_folder).toBe(false);
    expect(file.parent_path).toEqual('/src');
    expect(file.created_at).toBeInstanceOf(Date);
    expect(file.updated_at).toBeInstanceOf(Date);
  });

  it('should only return files for the specified project', async () => {
    // Create two users and two projects
    const [user1] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test2@example.com',
        name: 'Test User 2'
      })
      .returning()
      .execute();

    const [project1] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user1.id
      })
      .returning()
      .execute();

    const [project2] = await db.insert(projectsTable)
      .values({
        ...testProject,
        name: 'Second Project',
        slug: 'second-project',
        user_id: user2.id
      })
      .returning()
      .execute();

    // Add files to both projects
    await db.insert(filesTable)
      .values([
        {
          ...testFiles[0],
          project_id: project1.id
        },
        {
          ...testFiles[1],
          project_id: project1.id
        },
        {
          ...testFiles[2],
          project_id: project2.id
        }
      ])
      .execute();

    // Get files for project1 only
    const result = await getProjectFiles(project1.id);

    expect(result).toHaveLength(2);
    result.forEach(file => {
      expect(file.project_id).toEqual(project1.id);
    });

    // Verify project2 has different files
    const project2Files = await getProjectFiles(project2.id);
    expect(project2Files).toHaveLength(1);
    expect(project2Files[0].project_id).toEqual(project2.id);
    expect(project2Files[0].name).toEqual('package.json');
  });

  it('should handle projects with mixed file types and folder structures', async () => {
    // Create user and project
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [project] = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create all test files to test complex folder structure
    await db.insert(filesTable)
      .values(testFiles.map(file => ({
        ...file,
        project_id: project.id
      })))
      .execute();

    const result = await getProjectFiles(project.id);

    // Verify proper parent-child relationships
    const srcFolder = result.find(f => f.name === 'src' && f.is_folder);
    const componentsFolder = result.find(f => f.name === 'components' && f.is_folder);
    const indexFile = result.find(f => f.name === 'index.js');
    const appFile = result.find(f => f.name === 'App.js');
    const packageFile = result.find(f => f.name === 'package.json');

    // Verify folder structure relationships
    expect(srcFolder?.parent_path).toBeNull();
    expect(componentsFolder?.parent_path).toEqual('/src');
    expect(indexFile?.parent_path).toEqual('/src');
    expect(appFile?.parent_path).toEqual('/src/components');
    expect(packageFile?.parent_path).toBeNull();

    // Verify content types
    expect(srcFolder?.content).toEqual('');
    expect(componentsFolder?.content).toEqual('');
    expect(indexFile?.content).toContain('console.log');
    expect(appFile?.content).toContain('function App');
    expect(packageFile?.content).toContain('test-app');
  });
});