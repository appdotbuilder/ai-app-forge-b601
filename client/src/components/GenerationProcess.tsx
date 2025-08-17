import { useState, useEffect } from 'react';
import { Rocket, CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';

interface GenerationProcessProps {
  projectId: number;
  onComplete: (projectSlug: string) => void;
}

const GENERATION_STEPS = [
  { message: 'Initializing sandbox...', duration: 1000 },
  { message: 'Analyzing requirements...', duration: 1500 },
  { message: 'Listing features...', duration: 1200 },
  { message: 'Generating components...', duration: 2000 },
  { message: 'Setting up database...', duration: 800 },
  { message: 'Building app structure...', duration: 1500 },
  { message: 'Finalizing project...', duration: 800 }
];

export function GenerationProcess({ projectId, onComplete }: GenerationProcessProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const processStep = async (stepIndex: number) => {
      if (stepIndex >= GENERATION_STEPS.length) {
        // All steps complete, trigger AI generation
        try {
          const result = await trpc.simulateAIGeneration.mutate({ projectId });
          setIsComplete(true);
          
          // Wait a bit before redirecting
          setTimeout(() => {
            onComplete(result.project.slug);
          }, 1500);
        } catch (error) {
          console.error('Failed to simulate AI generation:', error);
        }
        return;
      }

      setCurrentStep(stepIndex);
      
      timeoutId = setTimeout(() => {
        setCompletedSteps(prev => [...prev, stepIndex]);
        processStep(stepIndex + 1);
      }, GENERATION_STEPS[stepIndex].duration);
    };

    processStep(0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [projectId, onComplete]);

  const currentMessage = currentStep < GENERATION_STEPS.length 
    ? GENERATION_STEPS[currentStep].message 
    : 'Generation complete!';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Main Animation */}
        <div className="relative mb-12">
          {/* Outer glow ring */}
          <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${
            isComplete 
              ? 'bg-green-400/20 animate-pulse' 
              : 'bg-blue-400/20 animate-ping'
          }`} style={{ 
            width: '200px', 
            height: '200px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          
          {/* Middle ring */}
          <div className={`absolute rounded-full transition-all duration-500 ${
            isComplete 
              ? 'bg-green-500/30' 
              : 'bg-blue-500/30 animate-spin'
          }`} style={{ 
            width: '160px', 
            height: '160px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          
          {/* Inner circle with icon */}
          <div className={`relative mx-auto w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
            isComplete 
              ? 'bg-green-600' 
              : 'bg-gradient-to-r from-blue-600 to-purple-600'
          }`}>
            {isComplete ? (
              <CheckCircle className="w-16 h-16 text-white" />
            ) : (
              <Rocket className={`w-16 h-16 text-white ${!isComplete ? 'animate-bounce' : ''}`} />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            {isComplete ? '🎉 Your App is Ready!' : '🚀 Building Your App'}
          </h1>
          
          <p className="text-xl text-blue-100 mb-8">
            {currentMessage}
          </p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${((completedSteps.length + (isComplete ? 1 : 0)) / (GENERATION_STEPS.length + 1)) * 100}%` 
                }}
              />
            </div>
            <p className="text-blue-200 text-sm mt-2">
              {completedSteps.length} of {GENERATION_STEPS.length} steps complete
            </p>
          </div>
        </div>

        {/* Steps List */}
        <div className="max-w-lg mx-auto">
          <div className="space-y-3">
            {GENERATION_STEPS.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  completedSteps.includes(index)
                    ? 'bg-green-500/20 text-green-100'
                    : index === currentStep && !isComplete
                    ? 'bg-blue-500/20 text-blue-100'
                    : 'bg-white/5 text-gray-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  completedSteps.includes(index)
                    ? 'bg-green-500'
                    : index === currentStep && !isComplete
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
                }`}>
                  {completedSteps.includes(index) ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  )}
                </div>
                
                <span className="flex-1 text-left">{step.message}</span>
                
                {index === currentStep && !isComplete && (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            ))}
          </div>
        </div>

        {isComplete && (
          <div className="mt-8">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full text-white">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Redirecting to workspace...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}