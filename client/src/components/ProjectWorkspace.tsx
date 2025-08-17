import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { FileExplorer } from '@/components/workspace/FileExplorer';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { PreviewPane } from '@/components/workspace/PreviewPane';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { trpc } from '@/utils/trpc';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { User, Project, File } from '../../../server/src/schema';

interface ProjectWorkspaceProps {
  projectSlug: string;
  user: User | null;
  onNavigate: (view: 'dashboard' | 'landing') => void;
}

export function ProjectWorkspace({ projectSlug, user, onNavigate }: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project data
  const loadProject = useCallback(async () => {
    try {
      const projectResult = await trpc.getProjectBySlug.query({ slug: projectSlug });
      if (!projectResult) {
        setError('Project not found');
        return;
      }
      
      setProject(projectResult);
      
      // Load project files
      const filesResult = await trpc.getProjectFiles.query({ projectId: projectResult.id });
      setFiles(filesResult);
      
      // Select first file if available
      const firstFile = filesResult.find((f: File) => !f.is_folder);
      if (firstFile) {
        setSelectedFile(firstFile);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleFileSelect = (file: File) => {
    if (!file.is_folder) {
      setSelectedFile(file);
    }
  };

  const handleFileCreate = async (fileData: { 
    path: string; 
    name: string; 
    is_folder: boolean; 
    parent_path: string | null; 
  }) => {
    if (!project) return;
    
    try {
      const newFile = await trpc.createFile.mutate({
        project_id: project.id,
        path: fileData.path,
        name: fileData.name,
        content: fileData.is_folder ? '' : '// New file\n',
        is_folder: fileData.is_folder,
        parent_path: fileData.parent_path
      });
      
      setFiles(prev => [...prev, newFile]);
      
      if (!fileData.is_folder) {
        setSelectedFile(newFile);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleFileUpdate = async (fileId: number, updates: { name?: string; content?: string }) => {
    try {
      const updatedFile = await trpc.updateFile.mutate({
        id: fileId,
        ...updates
      });
      
      setFiles(prev => prev.map((f: File) => f.id === fileId ? updatedFile : f));
      
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile(updatedFile);
      }
    } catch (error) {
      console.error('Failed to update file:', error);
    }
  };

  const handleFileDelete = async (fileId: number) => {
    if (!project) return;
    
    try {
      await trpc.deleteFile.mutate({ fileId, projectId: project.id });
      
      setFiles(prev => prev.filter((f: File) => f.id !== fileId));
      
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'The requested project could not be found.'}</p>
          <Button onClick={() => onNavigate('dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <WorkspaceHeader
        project={project}
        user={user}
        onNavigate={onNavigate}
        onProjectUpdate={handleProjectUpdate}
      />

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Chat Panel */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <ChatPanel projectId={project.id} userId={user?.id || 1} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor Section */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="h-full flex flex-col">
              {/* Editor Toggle */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <h2 className="text-sm font-medium text-gray-300">
                  {isEditorVisible ? 'Code Editor' : 'Preview Only'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditorVisible(!isEditorVisible)}
                  className="text-gray-400 hover:text-white"
                >
                  {isEditorVisible ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {isEditorVisible ? (
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                  {/* Code Pane */}
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <ResizablePanelGroup direction="vertical" className="h-full">
                      {/* File Explorer */}
                      <ResizablePanel defaultSize={40} minSize={25}>
                        <FileExplorer
                          files={files}
                          selectedFile={selectedFile}
                          onFileSelect={handleFileSelect}
                          onFileCreate={handleFileCreate}
                          onFileUpdate={handleFileUpdate}
                          onFileDelete={handleFileDelete}
                        />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      {/* Code Editor */}
                      <ResizablePanel defaultSize={60} minSize={40}>
                        <CodeEditor
                          file={selectedFile}
                          onFileUpdate={handleFileUpdate}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Preview Pane */}
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <PreviewPane
                      project={project}
                      onProjectUpdate={handleProjectUpdate}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                /* Preview Only */
                <div className="flex-1">
                  <PreviewPane
                    project={project}
                    onProjectUpdate={handleProjectUpdate}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}