import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { ExternalLink, RefreshCw, Rocket, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import type { Project } from '../../../../server/src/schema';

interface PreviewPaneProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const DEPLOYMENT_STEPS = [
  { message: 'Uploading files to cloud...', duration: 1500 },
  { message: 'Installing dependencies...', duration: 2000 },
  { message: 'Building application...', duration: 2500 },
  { message: 'Optimizing assets...', duration: 1000 },
  { message: 'Deploying to servers...', duration: 1500 },
  { message: 'Running health checks...', duration: 800 }
];

export function PreviewPane({ project, onProjectUpdate }: PreviewPaneProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentComplete, setDeploymentComplete] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStep(0);
    setDeploymentProgress(0);
    setDeploymentComplete(false);

    try {
      // Create deployment record
      await trpc.createDeployment.mutate({ project_id: project.id });

      // Simulate deployment steps
      for (let i = 0; i < DEPLOYMENT_STEPS.length; i++) {
        setDeploymentStep(i);
        setDeploymentProgress((i / DEPLOYMENT_STEPS.length) * 100);
        
        await new Promise(resolve => setTimeout(resolve, DEPLOYMENT_STEPS[i].duration));
      }

      // Complete deployment
      setDeploymentProgress(100);
      setDeploymentComplete(true);

      // Update project as deployed
      const updatedProject = await trpc.updateProject.mutate({
        id: project.id,
        is_deployed: true,
        deployment_url: `https://${project.slug}.vercel.app` // Mock URL
      });

      onProjectUpdate(updatedProject);

      setTimeout(() => {
        setIsDeploying(false);
        setDeploymentComplete(false);
      }, 2000);

    } catch (error) {
      console.error('Deployment failed:', error);
      setIsDeploying(false);
    }
  };

  const handleSync = async () => {
    // Simulate sync to GitHub and trigger deployment
    try {
      // This would sync to GitHub and trigger Vercel deployment
      console.log('Syncing to GitHub and triggering deployment...');
      
      // For now, just refresh the preview
      window.location.reload();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const currentStep = DEPLOYMENT_STEPS[deploymentStep];

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 flex-1">
          <Globe className="w-4 h-4 text-gray-400" />
          <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-sm text-gray-300 font-mono">
            {project.is_deployed && project.deployment_url 
              ? project.deployment_url 
              : 'Deploy to see preview URL'
            }
          </div>
          
          {project.deployment_url && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => window.open(project.deployment_url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={!project.is_deployed}
          className="ml-2 text-gray-400 hover:text-white"
          title="Sync to GitHub & Deploy"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center">
        {!project.is_deployed ? (
          /* Not Deployed State */
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-8 h-8 text-gray-500" />
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Deploy app to see preview here
            </h3>
            <p className="text-gray-400 mb-6">
              Your app needs to be deployed before you can see the live preview. 
              This will make your app accessible on the internet.
            </p>
            
            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              {isDeploying ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deploying...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  Deploy App
                </div>
              )}
            </Button>
          </div>
        ) : isDeploying ? (
          /* Deploying State */
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {deploymentComplete ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Rocket className="w-8 h-8 text-white animate-bounce" />
              )}
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              {deploymentComplete ? '🎉 Deployment Complete!' : '🚀 Deploying Your App'}
            </h3>
            
            <p className="text-gray-400 mb-6">
              {deploymentComplete ? 'Your app is now live!' : currentStep?.message || 'Preparing deployment...'}
            </p>
            
            <div className="space-y-4">
              <Progress value={deploymentProgress} className="w-full" />
              <p className="text-sm text-gray-500">
                {Math.round(deploymentProgress)}% complete
              </p>
            </div>
            
            {deploymentComplete && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => window.open(project.deployment_url!, '_blank')}
                  className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Live App
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Deployed State - Simulated Preview */
          <div className="w-full h-full bg-white">
            <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  App Successfully Deployed! 🎉
                </h3>
                <p className="text-gray-600 mb-4">
                  Your application is live and running at:
                </p>
                <div className="bg-gray-100 rounded-lg p-3 mb-4">
                  <code className="text-sm font-mono text-blue-600">
                    {project.deployment_url}
                  </code>
                </div>
                <Button
                  onClick={() => window.open(project.deployment_url!, '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  * Preview iframe simulation - Click "Open in New Tab" to see the real app
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-gray-400">
          <div className="flex items-center gap-1">
            {project.is_deployed ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-yellow-500" />
            )}
            <span>
              Status: {project.is_deployed ? 'Deployed' : 'Draft'}
            </span>
          </div>
          
          {project.is_deployed && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
        
        <div className="text-gray-500">
          Last updated: {project.updated_at.toLocaleString()}
        </div>
      </div>
    </div>
  );
}