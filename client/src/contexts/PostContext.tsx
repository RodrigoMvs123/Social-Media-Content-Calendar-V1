import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PostContextType {
  // State
  aiGeneratedContent: string;
  selectedPlatform: string;
  isAddPostDialogOpen: boolean;
  isAIDialogOpen: boolean;
  
  // Actions
  setAiGeneratedContent: (content: string) => void;
  setSelectedPlatform: (platform: string) => void;
  openAddPostDialog: (content?: string, platform?: string) => void;
  closeAddPostDialog: () => void;
  openAIDialog: () => void;
  closeAIDialog: () => void;
  resetState: () => void;
  refreshPosts: () => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [aiGeneratedContent, setAiGeneratedContent] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [isAddPostDialogOpen, setIsAddPostDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  const openAddPostDialog = (content = '', platform = '') => {
    if (content) setAiGeneratedContent(content);
    if (platform) setSelectedPlatform(platform);
    setIsAddPostDialogOpen(true);
  };

  const closeAddPostDialog = () => {
    setIsAddPostDialogOpen(false);
  };

  const openAIDialog = () => {
    // Reset content when opening AI dialog
    setAiGeneratedContent('');
    setSelectedPlatform('');
    setIsAIDialogOpen(true);
  };

  const closeAIDialog = () => {
    setIsAIDialogOpen(false);
  };

  const resetState = () => {
    setAiGeneratedContent('');
    setSelectedPlatform('');
    setIsAddPostDialogOpen(false);
    setIsAIDialogOpen(false);
  };

  // Function to refresh posts data
  const refreshPosts = () => {
    // Invalidate and refetch the posts query
    queryClient.invalidateQueries(['/api/calendar']);
  };

  return (
    <PostContext.Provider
      value={{
        aiGeneratedContent,
        selectedPlatform,
        isAddPostDialogOpen,
        isAIDialogOpen,
        setAiGeneratedContent,
        setSelectedPlatform,
        openAddPostDialog,
        closeAddPostDialog,
        openAIDialog,
        closeAIDialog,
        resetState,
        refreshPosts
      }}
    >
      {children}
    </PostContext.Provider>
  );
};

export const usePostContext = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePostContext must be used within a PostProvider');
  }
  return context;
};