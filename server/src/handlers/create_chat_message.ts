import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type CreateChatMessageInput, type ChatMessage } from '../schema';

export const createChatMessage = async (input: CreateChatMessageInput): Promise<ChatMessage> => {
  try {
    // Generate a simulated AI response based on the user message
    const aiResponse = generateAIResponse(input.message);

    // Insert the user's chat message with the AI response
    const result = await db.insert(chatMessagesTable)
      .values({
        project_id: input.project_id,
        user_id: input.user_id,
        message: input.message,
        response: aiResponse,
        is_ai_response: false // This represents the user's message
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Chat message creation failed:', error);
    throw error;
  }
};

// Helper function to simulate AI response generation
function generateAIResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Generate contextual responses based on common development keywords
  if (message.includes('bug') || message.includes('error') || message.includes('issue')) {
    return "I can help you debug this issue. Let me analyze the code and suggest some solutions. Can you share more details about when this occurs?";
  }
  
  if (message.includes('feature') || message.includes('add') || message.includes('implement')) {
    return "That's a great feature idea! I can help you implement this. Let me break down the steps and suggest the best approach for your project.";
  }
  
  if (message.includes('deploy') || message.includes('deployment')) {
    return "I can guide you through the deployment process. Let me check your current project setup and recommend the best deployment strategy.";
  }
  
  if (message.includes('database') || message.includes('data')) {
    return "For database-related tasks, I can help you design schemas, write queries, or optimize performance. What specific database work do you need assistance with?";
  }
  
  if (message.includes('test') || message.includes('testing')) {
    return "Testing is crucial for reliable code! I can help you write unit tests, integration tests, or set up testing frameworks. What would you like to test?";
  }
  
  if (message.includes('performance') || message.includes('optimize')) {
    return "Let's optimize your application! I can analyze your code for performance bottlenecks and suggest improvements. What specific performance issues are you experiencing?";
  }
  
  // Default response for general queries
  return `I understand you're asking about: "${userMessage}". I'm here to help with your development needs. Can you provide more specific details about what you'd like to accomplish?`;
}