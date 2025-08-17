import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import { Send, Bot, User } from 'lucide-react';
import type { ChatMessage } from '../../../../server/src/schema';

interface ChatPanelProps {
  projectId: number;
  userId: number;
}

export function ChatPanel({ projectId, userId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const result = await trpc.getChatMessages.query({ projectId });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  }, [projectId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    try {
      // Add user message immediately for better UX
      const userMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        project_id: projectId,
        user_id: userId,
        message: messageText,
        response: null,
        is_ai_response: false,
        created_at: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send to backend
      const createdMessage = await trpc.createChatMessage.mutate({
        project_id: projectId,
        user_id: userId,
        message: messageText
      });

      // Simulate AI response after a delay
      setTimeout(() => {
        const aiResponses = [
          "I understand you want to modify the project. Let me help you with that!",
          "Great idea! I can help implement that feature for you.",
          "That's an interesting request. I'll generate the code changes needed.",
          "I can help you with that modification. Let me analyze your project structure.",
          "Perfect! I'll work on implementing that functionality for you."
        ];

        const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        
        const aiMessage: ChatMessage = {
          id: Date.now() + 1,
          project_id: projectId,
          user_id: userId,
          message: randomResponse,
          response: null,
          is_ai_response: true,
          created_at: new Date()
        };

        setMessages(prev => [
          ...prev.filter(m => m.id !== userMessage.id), // Remove temp message
          createdMessage, // Add real user message
          aiMessage // Add AI response
        ]);
      }, 1500);

    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary message on error
      setMessages(prev => prev.filter(m => m.id !== Date.now()));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  return (
    <div className="h-full bg-gray-850 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium">AI Assistant</h3>
            <p className="text-gray-400 text-xs">Always ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                👋 Hi! I'm your AI assistant. Ask me anything about your project!
              </p>
            </div>
          ) : (
            messages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.is_ai_response ? '' : 'flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.is_ai_response 
                    ? 'bg-blue-600' 
                    : 'bg-purple-600'
                }`}>
                  {message.is_ai_response ? (
                    <Bot className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`max-w-[80%] ${message.is_ai_response ? '' : 'text-right'}`}>
                  <div className={`inline-block p-3 rounded-2xl text-sm ${
                    message.is_ai_response
                      ? 'bg-gray-700 text-white rounded-bl-sm'
                      : 'bg-blue-600 text-white rounded-br-sm'
                  }`}>
                    {message.message}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.created_at.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-700 p-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your project..."
            className="flex-1 min-h-[40px] max-h-[120px] bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}