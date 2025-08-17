import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, ExternalLink, GitBranch } from 'lucide-react';
import type { User, Project } from '../../../../server/src/schema';

interface WorkspaceHeaderProps {
  project: Project;
  user: User | null;
  onNavigate: (view: 'dashboard' | 'landing') => void;
  onProjectUpdate: (project: Project) => void;
}

export function WorkspaceHeader({ project, user, onNavigate, onProjectUpdate }: WorkspaceHeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('dashboard')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          
          <div>
            <h1 className="text-white font-semibold text-lg">{project.name}</h1>
            <p className="text-gray-400 text-sm">/{project.slug}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant={project.is_deployed ? 'default' : 'secondary'}
          className={project.is_deployed ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}
        >
          {project.is_deployed ? 'Live' : 'Draft'}
        </Badge>
        
        {project.deployment_url && (
          <Button
            variant="outline"
            size="sm"
            className="text-gray-300 border-gray-600 hover:bg-gray-700"
            onClick={() => window.open(project.deployment_url!, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Live
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          disabled
        >
          <GitBranch className="w-4 h-4 mr-2" />
          main
        </Button>

        {user && (
          <div className="text-sm text-gray-400">
            {user.name}
          </div>
        )}
      </div>
    </header>
  );
}