import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { AuthModal } from '@/components/AuthModal';
import { ProjectsDashboard } from '@/components/ProjectsDashboard';
import { ProjectWorkspace } from '@/components/ProjectWorkspace';
import { GenerationProcess } from '@/components/GenerationProcess';
import type { User } from '../../server/src/schema';

type AppView = 'landing' | 'dashboard' | 'workspace' | 'generating';

interface AppState {
  currentView: AppView;
  user: User | null;
  isAuthModalOpen: boolean;
  authMode: 'login' | 'register';
  currentProjectSlug: string | null;
  generatingProjectId: number | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'landing',
    user: null,
    isAuthModalOpen: false,
    authMode: 'login',
    currentProjectSlug: null,
    generatingProjectId: null
  });

  // Handle URL-based routing
  useEffect(() => {
    const path = window.location.pathname;
    
    if (path.startsWith('/workspace/')) {
      const slug = path.replace('/workspace/', '');
      setState(prev => ({ 
        ...prev, 
        currentView: 'workspace', 
        currentProjectSlug: slug 
      }));
    } else if (path === '/dashboard') {
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
    } else {
      setState(prev => ({ ...prev, currentView: 'landing' }));
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthModalOpen: false,
      currentView: 'dashboard'
    }));
    window.history.pushState({}, '', '/dashboard');
  };

  const handleStartGeneration = (projectId: number) => {
    setState(prev => ({
      ...prev,
      currentView: 'generating',
      generatingProjectId: projectId
    }));
  };

  const handleGenerationComplete = (projectSlug: string) => {
    setState(prev => ({
      ...prev,
      currentView: 'workspace',
      currentProjectSlug: projectSlug,
      generatingProjectId: null
    }));
    window.history.pushState({}, '', `/workspace/${projectSlug}`);
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setState(prev => ({ ...prev, isAuthModalOpen: true, authMode: mode }));
  };

  const closeAuthModal = () => {
    setState(prev => ({ ...prev, isAuthModalOpen: false }));
  };

  const navigateTo = (view: AppView, slug?: string) => {
    setState(prev => ({ 
      ...prev, 
      currentView: view, 
      currentProjectSlug: slug || null 
    }));
    
    if (view === 'dashboard') {
      window.history.pushState({}, '', '/dashboard');
    } else if (view === 'workspace' && slug) {
      window.history.pushState({}, '', `/workspace/${slug}`);
    } else if (view === 'landing') {
      window.history.pushState({}, '', '/');
    }
  };

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'landing':
        return (
          <LandingPage
            user={state.user}
            onAuthRequest={openAuthModal}
            onStartGeneration={handleStartGeneration}
            onNavigate={navigateTo}
          />
        );
      
      case 'dashboard':
        return state.user ? (
          <ProjectsDashboard
            user={state.user}
            onNavigate={navigateTo}
            onStartGeneration={handleStartGeneration}
          />
        ) : null;
      
      case 'workspace':
        return state.currentProjectSlug ? (
          <ProjectWorkspace
            projectSlug={state.currentProjectSlug}
            user={state.user}
            onNavigate={navigateTo}
          />
        ) : null;
      
      case 'generating':
        return state.generatingProjectId ? (
          <GenerationProcess
            projectId={state.generatingProjectId}
            onComplete={handleGenerationComplete}
          />
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderCurrentView()}
      
      <AuthModal
        isOpen={state.isAuthModalOpen}
        mode={state.authMode}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
        onModeSwitch={(mode) => setState(prev => ({ ...prev, authMode: mode }))}
      />
    </div>
  );
}

export default App;