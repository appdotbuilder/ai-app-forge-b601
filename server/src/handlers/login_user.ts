import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';

const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password: string, hash: string): boolean => {
  const hashedInput = hashPassword(password);
  const hashedInputBuffer = Buffer.from(hashedInput, 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');
  
  // Use timing-safe comparison to prevent timing attacks
  if (hashedInputBuffer.length !== hashBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(hashedInputBuffer, hashBuffer);
};

export const loginUser = async (input: LoginUserInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Return user data
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};