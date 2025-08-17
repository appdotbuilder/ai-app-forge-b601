import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual(testInput.password); // Should be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await registerUser(testInput);

    // Password should be hashed, not stored in plain text
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed passwords are longer

    // Verify password can be verified using Bun's built-in function
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate email addresses', async () => {
    // Register first user
    await registerUser(testInput);

    // Try to register another user with same email
    const duplicateInput: RegisterUserInput = {
      email: 'test@example.com',
      password: 'differentpassword',
      name: 'Different User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different valid inputs', async () => {
    const differentInput: RegisterUserInput = {
      email: 'user@company.org',
      password: 'securepassword456',
      name: 'John Doe'
    };

    const result = await registerUser(differentInput);

    expect(result.email).toEqual('user@company.org');
    expect(result.name).toEqual('John Doe');
    expect(result.password_hash).toBeDefined();

    // Verify this user exists in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'user@company.org'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
  });

  it('should set timestamps correctly', async () => {
    const beforeTime = new Date();
    const result = await registerUser(testInput);
    const afterTime = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});