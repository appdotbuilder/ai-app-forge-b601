import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { promptSuggestionsTable } from '../db/schema';
import { type CreatePromptSuggestionInput } from '../schema';
import { getPromptSuggestions } from '../handlers/get_prompt_suggestions';
import { eq } from 'drizzle-orm';

// Test data for prompt suggestions
const activePrompt1: CreatePromptSuggestionInput = {
  text: 'Build a todo app with React',
  category: 'productivity',
  is_active: true
};

const activePrompt2: CreatePromptSuggestionInput = {
  text: 'Create a blog with authentication',
  category: 'content',
  is_active: true
};

const inactivePrompt: CreatePromptSuggestionInput = {
  text: 'Inactive suggestion',
  category: 'test',
  is_active: false
};

const uncategorizedPrompt: CreatePromptSuggestionInput = {
  text: 'Design a landing page',
  category: null,
  is_active: true
};

describe('getPromptSuggestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no prompt suggestions exist', async () => {
    const result = await getPromptSuggestions();

    expect(result).toEqual([]);
  });

  it('should return active prompt suggestions only', async () => {
    // Create test data
    await db.insert(promptSuggestionsTable)
      .values([activePrompt1, activePrompt2, inactivePrompt])
      .execute();

    const result = await getPromptSuggestions();

    expect(result).toHaveLength(2);
    
    // Verify only active suggestions are returned
    result.forEach(suggestion => {
      expect(suggestion.is_active).toBe(true);
    });

    // Check specific suggestions are included
    const texts = result.map(s => s.text);
    expect(texts).toContain('Build a todo app with React');
    expect(texts).toContain('Create a blog with authentication');
    expect(texts).not.toContain('Inactive suggestion');
  });

  it('should return suggestions ordered by creation date (newest first)', async () => {
    // Insert suggestions with slight delay to ensure different timestamps
    const first = await db.insert(promptSuggestionsTable)
      .values(activePrompt1)
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const second = await db.insert(promptSuggestionsTable)
      .values(activePrompt2)
      .returning()
      .execute();

    const result = await getPromptSuggestions();

    expect(result).toHaveLength(2);
    
    // Verify ordering - newer suggestion should come first
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[0].text).toBe(activePrompt2.text); // Second inserted should be first
  });

  it('should handle suggestions with null categories', async () => {
    await db.insert(promptSuggestionsTable)
      .values([activePrompt1, uncategorizedPrompt])
      .execute();

    const result = await getPromptSuggestions();

    expect(result).toHaveLength(2);
    
    const uncategorized = result.find(s => s.category === null);
    expect(uncategorized).toBeDefined();
    expect(uncategorized?.text).toBe('Design a landing page');
    expect(uncategorized?.is_active).toBe(true);
  });

  it('should return suggestions with all required fields', async () => {
    await db.insert(promptSuggestionsTable)
      .values(activePrompt1)
      .execute();

    const result = await getPromptSuggestions();

    expect(result).toHaveLength(1);
    
    const suggestion = result[0];
    expect(suggestion.id).toBeDefined();
    expect(typeof suggestion.id).toBe('number');
    expect(suggestion.text).toBe(activePrompt1.text);
    expect(suggestion.category).toBe(activePrompt1.category);
    expect(suggestion.is_active).toBe(true);
    expect(suggestion.created_at).toBeInstanceOf(Date);
  });

  it('should verify data persists correctly in database', async () => {
    const inserted = await db.insert(promptSuggestionsTable)
      .values(activePrompt1)
      .returning()
      .execute();

    // Query directly from database to verify persistence
    const dbSuggestions = await db.select()
      .from(promptSuggestionsTable)
      .where(eq(promptSuggestionsTable.id, inserted[0].id))
      .execute();

    expect(dbSuggestions).toHaveLength(1);
    expect(dbSuggestions[0].text).toBe(activePrompt1.text);
    expect(dbSuggestions[0].category).toBe(activePrompt1.category);
    expect(dbSuggestions[0].is_active).toBe(true);

    // Verify handler returns the same data
    const handlerResult = await getPromptSuggestions();
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0]).toEqual(dbSuggestions[0]);
  });
});