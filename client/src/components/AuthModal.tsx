import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { User, Eye, EyeOff } from 'lucide-react';
import type { User as UserType } from '../../../server/src/schema';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  onModeSwitch: (mode: 'login' | 'register') => void;
}

export function AuthModal({ isOpen, mode, onClose, onSuccess, onModeSwitch }: AuthModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const user = await trpc.registerUser.mutate({
          email: formData.email,
          password: formData.password,
          name: formData.name
        });
        onSuccess(user);
      } else {
        const user = await trpc.loginUser.query({
          email: formData.email,
          password: formData.password
        });
        onSuccess(user);
      }
      
      // Reset form
      setFormData({ email: '', password: '', name: '' });
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(mode === 'login' ? 'Invalid credentials' : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setError(null);
    setFormData({ email: '', password: '', name: '' });
    onModeSwitch(mode === 'login' ? 'register' : 'login');
  };

  const handleClose = () => {
    setError(null);
    setFormData({ email: '', password: '', name: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter your full name"
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, email: e.target.value }))
              }
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, password: e.target.value }))
                }
                placeholder="Enter your password"
                required
                disabled={isLoading}
                minLength={mode === 'register' ? 8 : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </Button>
            </div>
            {mode === 'register' && (
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleModeSwitch}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              disabled={isLoading}
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'
              }
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}