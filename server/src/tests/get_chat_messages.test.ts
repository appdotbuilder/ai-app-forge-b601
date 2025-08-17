import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, chatMessagesTable } from '../db/schema';
import { getChatMessages } from '../handlers/get_chat_messages';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  name: 'Test User'
};

const testProject = {
  name: 'Test Project',
  description: 'A project for testing',
  ai_prompt: 'Create a test application',
  slug: 'test-project-chat'
};

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no chat messages exist', async () => {
    // Create user and project first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const result = await getChatMessages(projectResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return chat messages for specific project', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create chat messages
    const chatMessages = [
      {
        project_id: projectResult[0].id,
        user_id: userResult[0].id,
        message: 'Hello, can you help me?',
        response: 'Sure! How can I assist you?',
        is_ai_response: false
      },
      {
        project_id: projectResult[0].id,
        user_id: userResult[0].id,
        message: 'I need help with React',
        response: null,
        is_ai_response: true
      }
    ];

    await db.insert(chatMessagesTable)
      .values(chatMessages)
      .execute();

    const result = await getChatMessages(projectResult[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].message).toEqual('Hello, can you help me?');
    expect(result[0].response).toEqual('Sure! How can I assist you?');
    expect(result[0].is_ai_response).toBe(false);
    expect(result[0].project_id).toEqual(projectResult[0].id);
    expect(result[0].user_id).toEqual(userResult[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].message).toEqual('I need help with React');
    expect(result[1].response).toBeNull();
    expect(result[1].is_ai_response).toBe(true);
  });

  it('should return messages ordered by creation date (oldest first)', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create messages with slight delay to ensure different timestamps
    const message1 = await db.insert(chatMessagesTable)
      .values({
        project_id: projectResult[0].id,
        user_id: userResult[0].id,
        message: 'First message',
        response: null,
        is_ai_response: false
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const message2 = await db.insert(chatMessagesTable)
      .values({
        project_id: projectResult[0].id,
        user_id: userResult[0].id,
        message: 'Second message',
        response: null,
        is_ai_response: false
      })
      .returning()
      .execute();

    const result = await getChatMessages(projectResult[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].message).toEqual('First message');
    expect(result[1].message).toEqual('Second message');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should only return messages for specified project', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create two projects
    const project1Result = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userResult[0].id,
        slug: 'test-project-1'
      })
      .returning()
      .execute();

    const project2Result = await db.insert(projectsTable)
      .values({
        ...testProject,
        name: 'Test Project 2',
        user_id: userResult[0].id,
        slug: 'test-project-2'
      })
      .returning()
      .execute();

    // Create messages for both projects
    await db.insert(chatMessagesTable)
      .values([
        {
          project_id: project1Result[0].id,
          user_id: userResult[0].id,
          message: 'Message for project 1',
          response: null,
          is_ai_response: false
        },
        {
          project_id: project2Result[0].id,
          user_id: userResult[0].id,
          message: 'Message for project 2',
          response: null,
          is_ai_response: false
        }
      ])
      .execute();

    // Get messages for project 1 only
    const result = await getChatMessages(project1Result[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].message).toEqual('Message for project 1');
    expect(result[0].project_id).toEqual(project1Result[0].id);
  });

  it('should return empty array for non-existent project', async () => {
    const nonExistentProjectId = 99999;

    const result = await getChatMessages(nonExistentProjectId);

    expect(result).toEqual([]);
  });

  it('should handle messages with all field variations', async () => {
    // Create user and project
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create message with null response
    await db.insert(chatMessagesTable)
      .values({
        project_id: projectResult[0].id,
        user_id: userResult[0].id,
        message: 'User message without response',
        response: null,
        is_ai_response: false
      })
      .execute();

    // Create AI response message
    await db.insert(chatMessagesTable)
      .values({
        project_id: projectResult[0].id,
        user_id: userResult[0].id,
        message: 'AI generated message',
        response: 'Here is my detailed response',
        is_ai_response: true
      })
      .execute();

    const result = await getChatMessages(projectResult[0].id);

    expect(result).toHaveLength(2);
    
    // Check first message (null response)
    expect(result[0].response).toBeNull();
    expect(result[0].is_ai_response).toBe(false);
    
    // Check second message (with response)
    expect(result[1].response).toEqual('Here is my detailed response');
    expect(result[1].is_ai_response).toBe(true);
  });
});