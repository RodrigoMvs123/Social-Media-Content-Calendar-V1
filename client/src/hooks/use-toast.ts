interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const useToast = () => {
  const toast = (options: ToastOptions) => {
    console.log('Toast:', options);
    // In a real implementation, this would show a toast notification
    // For now, we'll just log to the console
  };

  return { toast };
};