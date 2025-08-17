import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { Plus, Send, Sparkles, Zap, Rocket } from 'lucide-react';
import type { User, PromptSuggestion } from '../../../server/src/schema';

interface LandingPageProps {
  user: User | null;
  onAuthRequest: (mode: 'login' | 'register') => void;
  onStartGeneration: (projectId: number) => void;
  onNavigate: (view: 'dashboard') => void;
}

export function LandingPage({ user, onAuthRequest, onStartGeneration, onNavigate }: LandingPageProps) {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load prompt suggestions
  const loadSuggestions = useCallback(async () => {
    try {
      const result = await trpc.getPromptSuggestions.query();
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to load prompt suggestions:', error);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !user) return;

    setIsLoading(true);
    try {
      // Create project with AI prompt
      const project = await trpc.createProject.mutate({
        user_id: user.id,
        name: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''), // Use first part of prompt as name
        description: null,
        ai_prompt: prompt
      });

      onStartGeneration(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: PromptSuggestion) => {
    setPrompt(suggestion.text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Builder
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-600">Welcome, {user.name}!</span>
              <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                My Projects
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onAuthRequest('login')}>
                Sign In
              </Button>
              <Button onClick={() => onAuthRequest('register')}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered App Builder
            </div>
            
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Build Apps with
              <br />
              <span className="relative">
                AI Magic ✨
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
              Describe your app idea and watch as AI generates a complete, deployable application in seconds.
              No coding required.
            </p>

            {/* Input Section */}
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="mb-8">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="flex-shrink-0 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        disabled
                      >
                        <Plus className="w-5 h-5 text-gray-500" />
                      </button>
                      
                      <Input
                        value={prompt}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                        placeholder="Describe your app idea... (e.g., 'Build a todo app with user authentication')"
                        className="flex-1 border-0 bg-transparent text-lg placeholder:text-gray-500 focus-visible:ring-0 px-0"
                        disabled={isLoading || !user}
                      />
                      
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!prompt.trim() || isLoading || !user}
                        className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    
                    {!user && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Please sign in to start building your app
                      </p>
                    )}
                  </div>
                </div>
              </form>

              {/* Prompt Suggestions */}
              {suggestions.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">✨ Try these ideas:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((suggestion: PromptSuggestion) => (
                      <Badge
                        key={suggestion.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors px-4 py-2 text-sm rounded-full"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.text}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered Generation</h3>
              <p className="text-gray-600 text-sm">
                Advanced AI understands your requirements and generates complete applications
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Deployment</h3>
              <p className="text-gray-600 text-sm">
                Your app is deployed and ready to share in seconds, not hours
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Full-Stack Apps</h3>
              <p className="text-gray-600 text-sm">
                Complete applications with frontend, backend, and database ready to go
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}