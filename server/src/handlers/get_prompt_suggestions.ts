import { db } from '../db';
import { promptSuggestionsTable } from '../db/schema';
import { type PromptSuggestion } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPromptSuggestions = async (): Promise<PromptSuggestion[]> => {
  try {
    // Query for active prompt suggestions, ordered by creation date (newest first)
    const results = await db.select()
      .from(promptSuggestionsTable)
      .where(eq(promptSuggestionsTable.is_active, true))
      .orderBy(desc(promptSuggestionsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch prompt suggestions:', error);
    throw error;
  }
};