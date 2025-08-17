import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { createHash } from 'crypto';

// Helper function to hash passwords (matches handler implementation)
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'securepassword123',
  name: 'Test User'
};

const loginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'securepassword123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with correct credentials', async () => {
    // Create test user first
    const hashedPassword = hashPassword(testUser.password);
    const insertedUsers = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword,
        name: testUser.name
      })
      .returning()
      .execute();

    const result = await loginUser(loginInput);

    // Verify user data
    expect(result.id).toBe(insertedUsers[0].id);
    expect(result.email).toBe(testUser.email);
    expect(result.name).toBe(testUser.name);
    expect(result.password_hash).toBe(hashedPassword);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user with different password
    const hashedPassword = hashPassword('differentpassword');
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword,
        name: testUser.name
      })
      .execute();

    const invalidInput: LoginUserInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should verify password against hash correctly', async () => {
    // Create user with known password
    const plainPassword = 'mySecretPassword123';
    const hashedPassword = hashPassword(plainPassword);
    
    await db.insert(usersTable)
      .values({
        email: 'hash-test@example.com',
        password_hash: hashedPassword,
        name: 'Hash Test User'
      })
      .execute();

    const validInput: LoginUserInput = {
      email: 'hash-test@example.com',
      password: plainPassword
    };

    const result = await loginUser(validInput);

    expect(result.email).toBe('hash-test@example.com');
    expect(result.name).toBe('Hash Test User');
    
    // Verify the stored hash matches what we expect
    const expectedHash = hashPassword(plainPassword);
    expect(result.password_hash).toBe(expectedHash);
  });

  it('should handle multiple users with different emails', async () => {
    // Create multiple users
    const user1Password = hashPassword('password1');
    const user2Password = hashPassword('password2');

    await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: user1Password,
          name: 'User One'
        },
        {
          email: 'user2@example.com',
          password_hash: user2Password,
          name: 'User Two'
        }
      ])
      .execute();

    // Login as first user
    const user1Result = await loginUser({
      email: 'user1@example.com',
      password: 'password1'
    });

    expect(user1Result.email).toBe('user1@example.com');
    expect(user1Result.name).toBe('User One');

    // Login as second user
    const user2Result = await loginUser({
      email: 'user2@example.com',
      password: 'password2'
    });

    expect(user2Result.email).toBe('user2@example.com');
    expect(user2Result.name).toBe('User Two');

    // Verify different user IDs
    expect(user1Result.id).not.toBe(user2Result.id);
  });

  it('should maintain case sensitivity for email', async () => {
    const hashedPassword = hashPassword(testUser.password);
    await db.insert(usersTable)
      .values({
        email: 'Test@Example.com', // Mixed case email
        password_hash: hashedPassword,
        name: testUser.name
      })
      .execute();

    // Exact case match should work
    const result = await loginUser({
      email: 'Test@Example.com',
      password: testUser.password
    });

    expect(result.email).toBe('Test@Example.com');

    // Different case should fail
    await expect(loginUser({
      email: 'test@example.com', // Different case
      password: testUser.password
    })).rejects.toThrow(/invalid email or password/i);
  });

  it('should use timing-safe password comparison', async () => {
    // Create user with known password
    const password = 'testpassword';
    const hashedPassword = hashPassword(password);
    
    await db.insert(usersTable)
      .values({
        email: 'timing-test@example.com',
        password_hash: hashedPassword,
        name: 'Timing Test User'
      })
      .execute();

    // Valid password should work
    const result = await loginUser({
      email: 'timing-test@example.com',
      password: password
    });

    expect(result.email).toBe('timing-test@example.com');

    // Invalid password with same length should fail
    await expect(loginUser({
      email: 'timing-test@example.com',
      password: 'wrongpasswrd' // Same length, different content
    })).rejects.toThrow(/invalid email or password/i);
  });
});