import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onCreatePost: () => void;
  onGenerateWithAI?: () => void;
}

const EmptyState = ({ onCreatePost, onGenerateWithAI }: EmptyStateProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-12 px-6 text-center">
      <div className="mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Plus className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-2">No posts yet</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6">
        Get started by creating your first social media post or generate content with AI.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button onClick={() => onCreatePost()}>
          Create your first post
        </Button>
        {onGenerateWithAI && (
          <Button variant="outline" onClick={onGenerateWithAI}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;