import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { File as FileIcon, Folder, FolderOpen, Plus, Edit, Trash2, FileText } from 'lucide-react';
import type { File } from '../../../../server/src/schema';

interface FileExplorerProps {
  files: File[];
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileCreate: (fileData: { path: string; name: string; is_folder: boolean; parent_path: string | null }) => void;
  onFileUpdate: (fileId: number, updates: { name?: string }) => void;
  onFileDelete: (fileId: number) => void;
}

interface FileTreeItem {
  file: File;
  children: FileTreeItem[];
  depth: number;
}

export function FileExplorer({ files, selectedFile, onFileSelect, onFileCreate, onFileUpdate, onFileDelete }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentPath, setCreateParentPath] = useState<string>('/');
  const [newItemName, setNewItemName] = useState('');
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  // Build file tree structure
  const buildFileTree = (files: File[]): FileTreeItem[] => {
    const sortedFiles = [...files].sort((a: File, b: File) => {
      // Folders first, then files
      if (a.is_folder && !b.is_folder) return -1;
      if (!a.is_folder && b.is_folder) return 1;
      return a.name.localeCompare(b.name);
    });

    const buildTree = (parentPath: string | null, depth: number): FileTreeItem[] => {
      return sortedFiles
        .filter((file: File) => file.parent_path === parentPath)
        .map((file: File) => ({
          file,
          children: file.is_folder ? buildTree(file.path, depth + 1) : [],
          depth
        }));
    };

    return buildTree(null, 0);
  };

  const tree = buildFileTree(files);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleCreateNew = (type: 'file' | 'folder', parentPath: string = '/') => {
    setCreateType(type);
    setCreateParentPath(parentPath);
    setNewItemName('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!newItemName.trim()) return;

    const fullPath = createParentPath === '/' 
      ? `/${newItemName}` 
      : `${createParentPath}/${newItemName}`;

    onFileCreate({
      path: fullPath,
      name: newItemName.trim(),
      is_folder: createType === 'folder',
      parent_path: createParentPath === '/' ? null : createParentPath
    });

    setIsCreateDialogOpen(false);
    setNewItemName('');

    // Expand parent folder
    if (createParentPath !== '/') {
      setExpandedFolders(prev => new Set([...prev, createParentPath]));
    }
  };

  const handleRename = (file: File) => {
    setEditingFileId(file.id);
    setEditName(file.name);
  };

  const handleRenameSubmit = () => {
    if (editingFileId && editName.trim()) {
      onFileUpdate(editingFileId, { name: editName.trim() });
    }
    setEditingFileId(null);
    setEditName('');
  };

  const renderFileTreeItem = (item: FileTreeItem) => {
    const { file, children, depth } = item;
    const isSelected = selectedFile?.id === file.id;
    const isExpanded = expandedFolders.has(file.path);
    const isEditing = editingFileId === file.id;

    return (
      <div key={file.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-700 cursor-pointer group ${
            isSelected ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => file.is_folder ? toggleFolder(file.path) : onFileSelect(file)}
        >
          {file.is_folder ? (
            <div className="flex items-center gap-1">
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400" />
              )}
            </div>
          ) : (
            <FileText className="w-4 h-4 text-gray-400" />
          )}

          {isEditing ? (
            <Input
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') {
                  setEditingFileId(null);
                  setEditName('');
                }
              }}
              className="flex-1 h-6 px-1 text-sm bg-gray-800 border-gray-600 text-white"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm truncate">{file.name}</span>
          )}

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            {file.is_folder && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleCreateNew('file', file.path);
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleRename(file);
              }}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {file.is_folder ? 'Folder' : 'File'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{file.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => onFileDelete(file.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {file.is_folder && isExpanded && (
          <div>
            {children.map(renderFileTreeItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-850 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Files</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={() => handleCreateNew('file')}
          >
            <FileIcon className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={() => handleCreateNew('folder')}
          >
            <Folder className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {tree.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No files yet</p>
              <p className="text-xs mt-1">Create your first file</p>
            </div>
          ) : (
            tree.map(renderFileTreeItem)
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Create New {createType === 'file' ? 'File' : 'Folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                {createType === 'file' ? 'File' : 'Folder'} Name
              </label>
              <Input
                value={newItemName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value)}
                placeholder={createType === 'file' ? 'filename.js' : 'folder-name'}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') handleCreateSubmit();
                }}
                autoFocus
              />
            </div>
            <div className="text-sm text-gray-600">
              Location: {createParentPath === '/' ? 'Root' : createParentPath}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={!newItemName.trim()}
              >
                Create {createType === 'file' ? 'File' : 'Folder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}