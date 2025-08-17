import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileText, Save, GitBranch } from 'lucide-react';
import type { File } from '../../../../server/src/schema';

interface CodeEditorProps {
  file: File | null;
  onFileUpdate: (fileId: number, updates: { content: string }) => void;
}

export function CodeEditor({ file, onFileUpdate }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasUnsavedChanges(false);
    } else {
      setContent('');
      setHasUnsavedChanges(false);
    }
  }, [file]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasUnsavedChanges(file ? newContent !== file.content : false);
  };

  const handleSave = async () => {
    if (!file || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      await onFileUpdate(file.id, { content });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const getFileStats = () => {
    const lines = content.split('\n').length;
    const characters = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    
    return { lines, characters, words };
  };

  const stats = getFileStats();

  if (!file) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a file to start editing</p>
        </div>
      </div>
    );
  }

  if (file.is_folder) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Cannot edit folder</p>
          <p className="text-sm">Select a file to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">{file.name}</span>
          {hasUnsavedChanges && (
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="text-gray-400 hover:text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Textarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Start typing your code..."
          className="w-full h-full resize-none border-0 bg-gray-900 text-gray-100 font-mono text-sm leading-6 focus-visible:ring-0 p-4"
          style={{
            lineHeight: '1.5',
            tabSize: 2,
            minHeight: '100%'
          }}
        />
        
        {/* Line numbers overlay (simplified) */}
        <div className="absolute left-0 top-0 p-4 pointer-events-none text-gray-600 font-mono text-sm leading-6 select-none">
          {content.split('\n').map((_, index) => (
            <div key={index} className="text-right pr-4 w-8">
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>Lines: {stats.lines}</span>
          <span>Characters: {stats.characters}</span>
          <span>Words: {stats.words}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-gray-400 hover:text-white"
            disabled
          >
            <GitBranch className="w-3 h-3 mr-1" />
            Export
          </Button>
          
          <div className={`px-2 py-1 rounded text-xs ${
            hasUnsavedChanges 
              ? 'bg-orange-600/20 text-orange-400' 
              : 'bg-green-600/20 text-green-400'
          }`}>
            {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
          </div>
        </div>
      </div>
    </div>
  );
}