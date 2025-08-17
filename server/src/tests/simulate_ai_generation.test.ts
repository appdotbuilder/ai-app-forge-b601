import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, filesTable } from '../db/schema';
import { simulateAIGeneration } from '../handlers/simulate_ai_generation';
import { eq } from 'drizzle-orm';

describe('simulateAIGeneration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let reactProjectId: number;
  let apiProjectId: number;
  let fullStackProjectId: number;
  let basicProjectId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test projects with different AI prompts
    const reactProjectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'React Dashboard',
        description: 'A React-based dashboard application',
        ai_prompt: 'Create a React frontend application with TypeScript',
        slug: 'react-dashboard'
      })
      .returning()
      .execute();
    reactProjectId = reactProjectResult[0].id;

    const apiProjectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'User API',
        description: 'A REST API for user management',
        ai_prompt: 'Build a Node.js API server with Express for user management',
        slug: 'user-api'
      })
      .returning()
      .execute();
    apiProjectId = apiProjectResult[0].id;

    const fullStackProjectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Full Stack App',
        description: 'A complete web application',
        ai_prompt: 'Create a full stack application with React frontend and Node.js backend',
        slug: 'full-stack-app'
      })
      .returning()
      .execute();
    fullStackProjectId = fullStackProjectResult[0].id;

    const basicProjectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Simple Project',
        description: 'A basic project',
        ai_prompt: 'Create a simple project structure',
        slug: 'simple-project'
      })
      .returning()
      .execute();
    basicProjectId = basicProjectResult[0].id;
  });

  it('should generate React project files', async () => {
    const result = await simulateAIGeneration(reactProjectId);

    // Verify project details
    expect(result.project.id).toEqual(reactProjectId);
    expect(result.project.name).toEqual('React Dashboard');
    expect(result.project.ai_prompt).toEqual('Create a React frontend application with TypeScript');

    // Verify generated files structure
    expect(result.generatedFiles).toBeDefined();
    expect(result.generatedFiles.length).toBeGreaterThan(0);

    // Check for React-specific files
    const packageJson = result.generatedFiles.find(f => f.name === 'package.json' && f.path === '/package.json');
    expect(packageJson).toBeDefined();
    expect(packageJson!.content).toMatch(/react/);

    const appTsx = result.generatedFiles.find(f => f.name === 'App.tsx');
    expect(appTsx).toBeDefined();
    expect(appTsx!.content).toMatch(/React/);
    expect(appTsx!.content).toMatch(/React Dashboard/);

    // Check for folder structure
    const srcFolder = result.generatedFiles.find(f => f.name === 'src' && f.is_folder);
    expect(srcFolder).toBeDefined();
  });

  it('should generate API project files', async () => {
    const result = await simulateAIGeneration(apiProjectId);

    // Verify project details
    expect(result.project.name).toEqual('User API');

    // Check for API-specific files
    const packageJson = result.generatedFiles.find(f => f.name === 'package.json');
    expect(packageJson).toBeDefined();
    expect(packageJson!.content).toMatch(/express/);

    const serverJs = result.generatedFiles.find(f => f.name === 'server.js');
    expect(serverJs).toBeDefined();
    expect(serverJs!.content).toMatch(/express/);
    expect(serverJs!.content).toMatch(/User API/);

    const readme = result.generatedFiles.find(f => f.name === 'README.md');
    expect(readme).toBeDefined();
  });

  it('should generate full stack project files', async () => {
    const result = await simulateAIGeneration(fullStackProjectId);

    // Check for both frontend and backend folders
    const frontendFolder = result.generatedFiles.find(f => f.name === 'frontend' && f.is_folder);
    expect(frontendFolder).toBeDefined();

    const backendFolder = result.generatedFiles.find(f => f.name === 'backend' && f.is_folder);
    expect(backendFolder).toBeDefined();

    // Check for workspace package.json
    const rootPackageJson = result.generatedFiles.find(f => f.name === 'package.json' && f.path === '/package.json');
    expect(rootPackageJson).toBeDefined();
    expect(rootPackageJson!.content).toMatch(/workspaces/);

    // Check for frontend and backend package.json files
    const frontendPackageJson = result.generatedFiles.find(f => f.path === '/frontend/package.json');
    expect(frontendPackageJson).toBeDefined();

    const backendPackageJson = result.generatedFiles.find(f => f.path === '/backend/package.json');
    expect(backendPackageJson).toBeDefined();
  });

  it('should generate basic project files for unrecognized prompts', async () => {
    const result = await simulateAIGeneration(basicProjectId);

    // Should generate basic structure
    const readme = result.generatedFiles.find(f => f.name === 'README.md');
    expect(readme).toBeDefined();
    expect(readme!.content).toMatch(/Simple Project/);

    const indexJs = result.generatedFiles.find(f => f.name === 'index.js');
    expect(indexJs).toBeDefined();

    const srcFolder = result.generatedFiles.find(f => f.name === 'src' && f.is_folder);
    expect(srcFolder).toBeDefined();
  });

  it('should save generated files to database', async () => {
    await simulateAIGeneration(reactProjectId);

    // Verify files were saved to database
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, reactProjectId))
      .execute();

    expect(savedFiles.length).toBeGreaterThan(0);

    // Check specific files
    const packageJsonFile = savedFiles.find(f => f.name === 'package.json' && f.path === '/package.json');
    expect(packageJsonFile).toBeDefined();
    expect(packageJsonFile!.content).toMatch(/react/);
    expect(packageJsonFile!.is_folder).toBe(false);

    // Check folder structure
    const srcFolder = savedFiles.find(f => f.name === 'src' && f.is_folder);
    expect(srcFolder).toBeDefined();
    expect(srcFolder!.parent_path).toBeNull();

    // Check nested file
    const appFile = savedFiles.find(f => f.name === 'App.tsx');
    expect(appFile).toBeDefined();
    expect(appFile!.parent_path).toEqual('/src');
  });

  it('should handle parent path calculation correctly', async () => {
    const result = await simulateAIGeneration(fullStackProjectId);

    // Check files are saved with correct parent paths
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.project_id, fullStackProjectId))
      .execute();

    // Root level files should have null parent_path
    const rootPackageJson = savedFiles.find(f => f.path === '/package.json');
    expect(rootPackageJson!.parent_path).toBeNull();

    // Frontend files should have correct parent paths
    const frontendPackageJson = savedFiles.find(f => f.path === '/frontend/package.json');
    expect(frontendPackageJson!.parent_path).toEqual('/frontend');

    // Nested files should have correct parent paths
    const appJs = savedFiles.find(f => f.path === '/frontend/src/App.js');
    expect(appJs!.parent_path).toEqual('/frontend/src');
  });

  it('should throw error for non-existent project', async () => {
    const nonExistentProjectId = 99999;

    await expect(simulateAIGeneration(nonExistentProjectId))
      .rejects
      .toThrow(/Project with id 99999 not found/);
  });

  it('should generate files with proper naming conventions', async () => {
    const result = await simulateAIGeneration(reactProjectId);

    // All generated files should have valid names and paths
    result.generatedFiles.forEach(file => {
      expect(file.name).toBeTruthy();
      expect(file.path).toBeTruthy();
      expect(file.path.startsWith('/')).toBe(true);
      expect(typeof file.is_folder).toBe('boolean');
      expect(typeof file.content).toBe('string');
    });

    // Package.json should contain project name in slug format
    const packageJson = result.generatedFiles.find(f => f.name === 'package.json' && f.path === '/package.json');
    expect(packageJson!.content).toMatch(/react-dashboard/);
  });

  it('should handle projects with special characters in names', async () => {
    // Create project with special characters
    const specialProjectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'My React App @ 2024!',
        description: 'Project with special chars',
        ai_prompt: 'Create a React app with special characters in name',
        slug: 'my-react-app-2024'
      })
      .returning()
      .execute();

    const result = await simulateAIGeneration(specialProjectResult[0].id);

    // Package.json should handle special characters properly
    const packageJson = result.generatedFiles.find(f => f.name === 'package.json' && f.path === '/package.json');
    expect(packageJson!.content).toMatch(/"name": "my-react-app-2024"/);

    // Content should still reference original project name
    const appFile = result.generatedFiles.find(f => f.name === 'App.tsx');
    expect(appFile!.content).toMatch(/My React App @ 2024!/);
  });
});