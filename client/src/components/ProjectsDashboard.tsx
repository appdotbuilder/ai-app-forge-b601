import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { Plus, Folder, Calendar, Trash2, ExternalLink, Zap, Rocket } from 'lucide-react';
import type { User, Project } from '../../../server/src/schema';

interface ProjectsDashboardProps {
  user: User;
  onNavigate: (view: 'landing' | 'workspace', slug?: string) => void;
  onStartGeneration: (projectId: number) => void;
}

export function ProjectsDashboard({ user, onNavigate, onStartGeneration }: ProjectsDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectPrompt, setNewProjectPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const result = await trpc.getUserProjects.query({ userId: user.id });
      setProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectPrompt.trim()) return;

    setIsCreating(true);
    try {
      const project = await trpc.createProject.mutate({
        user_id: user.id,
        name: newProjectPrompt.slice(0, 50) + (newProjectPrompt.length > 50 ? '...' : ''),
        description: null,
        ai_prompt: newProjectPrompt
      });

      setProjects(prev => [project, ...prev]);
      setNewProjectPrompt('');
      onStartGeneration(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await trpc.deleteProject.mutate({ projectId, userId: user.id });
      setProjects(prev => prev.filter((p: Project) => p.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Builder
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Welcome back, {user.name}!</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Create New Project Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Projects</h1>
          
          <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
            <CardContent className="p-6">
              <form onSubmit={handleCreateProject} className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-blue-100 rounded-xl">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                
                <Input
                  value={newProjectPrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectPrompt(e.target.value)}
                  placeholder="Describe your new app idea... (e.g., 'Build a task management app with teams')"
                  className="flex-1 text-lg border-0 bg-transparent focus-visible:ring-0 px-0"
                  disabled={isCreating}
                />
                
                <Button
                  type="submit"
                  disabled={!newProjectPrompt.trim() || isCreating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      Generate App
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first AI-generated app by describing what you want to build in the field above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => onNavigate('workspace', project.slug)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate text-lg group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <CardDescription className="mt-1">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{project.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            Delete Project
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Created {project.created_at.toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={project.is_deployed ? 'default' : 'secondary'}
                        className={project.is_deployed ? 'bg-green-100 text-green-700' : ''}
                      >
                        {project.is_deployed ? 'Deployed' : 'Draft'}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Open workspace</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">AI Prompt:</span> {project.ai_prompt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}