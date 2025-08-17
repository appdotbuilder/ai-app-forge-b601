import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatMessagesTable, usersTable, projectsTable } from '../db/schema';
import { type CreateChatMessageInput } from '../schema';
import { createChatMessage } from '../handlers/create_chat_message';
import { eq } from 'drizzle-orm';

describe('createChatMessage', () => {
  let testUser: { id: number };
  let testProject: { id: number };

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create a test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUser.id,
        name: 'Test Project',
        description: 'A test project',
        ai_prompt: 'Create a simple web app',
        slug: 'test-project-slug'
      })
      .returning()
      .execute();
    testProject = projectResult[0];
  });

  afterEach(resetDB);

  const createTestInput = (message: string): CreateChatMessageInput => ({
    project_id: testProject.id,
    user_id: testUser.id,
    message
  });

  it('should create a chat message with AI response', async () => {
    const testInput = createTestInput('How can I fix this bug?');
    const result = await createChatMessage(testInput);

    // Verify basic message structure
    expect(result.project_id).toEqual(testProject.id);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.message).toEqual('How can I fix this bug?');
    expect(result.response).toBeDefined();
    expect(result.response).not.toBeNull();
    expect(result.is_ai_response).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save chat message to database', async () => {
    const testInput = createTestInput('I need help with deployment');
    const result = await createChatMessage(testInput);

    // Query the database to verify the message was saved
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toEqual('I need help with deployment');
    expect(messages[0].response).toBeDefined();
    expect(messages[0].project_id).toEqual(testProject.id);
    expect(messages[0].user_id).toEqual(testUser.id);
    expect(messages[0].is_ai_response).toBe(false);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate contextual AI responses for bug-related messages', async () => {
    const testInput = createTestInput('I found a bug in my code');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/debug|analyze|solution/i);
    expect(result.response).toContain('I can help you debug this issue');
  });

  it('should generate contextual AI responses for feature requests', async () => {
    const testInput = createTestInput('I want to add a new feature');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/feature|implement|steps/i);
    expect(result.response).toContain('implement this');
  });

  it('should generate contextual AI responses for deployment questions', async () => {
    const testInput = createTestInput('How do I deploy my application?');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/deploy|deployment|strategy/i);
    expect(result.response).toContain('deployment process');
  });

  it('should generate contextual AI responses for database questions', async () => {
    const testInput = createTestInput('I need help with database queries');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/database|schema|queries/i);
    expect(result.response).toContain('database-related tasks');
  });

  it('should generate contextual AI responses for testing questions', async () => {
    const testInput = createTestInput('How do I write tests for my code?');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/test|testing|unit tests/i);
    expect(result.response).toContain('Testing is crucial');
  });

  it('should generate contextual AI responses for performance questions', async () => {
    const testInput = createTestInput('My app is slow, how can I optimize it?');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/optimize|performance|bottleneck/i);
    expect(result.response).toContain('optimize your application');
  });

  it('should generate default response for general messages', async () => {
    const testInput = createTestInput('Hello, can you help me?');
    const result = await createChatMessage(testInput);

    expect(result.response).toContain('I understand you\'re asking about');
    expect(result.response).toContain('Hello, can you help me?');
    expect(result.response).toMatch(/development needs|specific details/i);
  });

  it('should handle empty message input', async () => {
    const testInput = createTestInput('');
    const result = await createChatMessage(testInput);

    expect(result.message).toEqual('');
    expect(result.response).toBeDefined();
    expect(result.response).toContain('I understand you\'re asking about: ""');
  });

  it('should handle case-insensitive keyword matching', async () => {
    const testInput = createTestInput('I HAVE A BUG IN MY CODE');
    const result = await createChatMessage(testInput);

    expect(result.response).toMatch(/debug|analyze|solution/i);
    expect(result.response).toContain('I can help you debug this issue');
  });

  it('should create multiple chat messages for same project', async () => {
    const firstInput = createTestInput('First message');
    const secondInput = createTestInput('Second message');

    const firstResult = await createChatMessage(firstInput);
    const secondResult = await createChatMessage(secondInput);

    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.message).toEqual('First message');
    expect(secondResult.message).toEqual('Second message');
    
    // Verify both messages exist in database
    const allMessages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.project_id, testProject.id))
      .execute();

    expect(allMessages).toHaveLength(2);
  });

  it('should handle foreign key constraints for non-existent project', async () => {
    const invalidInput: CreateChatMessageInput = {
      project_id: 99999,
      user_id: testUser.id,
      message: 'This should fail'
    };

    await expect(createChatMessage(invalidInput)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should handle foreign key constraints for non-existent user', async () => {
    const invalidInput: CreateChatMessageInput = {
      project_id: testProject.id,
      user_id: 99999,
      message: 'This should fail'
    };

    await expect(createChatMessage(invalidInput)).rejects.toThrow(/foreign key constraint/i);
  });
});