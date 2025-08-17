import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type ChatMessage } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getChatMessages(projectId: number): Promise<ChatMessage[]> {
  try {
    // Fetch chat messages for the specified project, ordered by creation date (oldest first)
    const results = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.project_id, projectId))
      .orderBy(asc(chatMessagesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    throw error;
  }
}