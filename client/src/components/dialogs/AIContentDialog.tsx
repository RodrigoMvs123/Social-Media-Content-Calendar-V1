import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, RefreshCw } from "lucide-react";
import { generateAIContent } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePostContext } from "@/contexts/PostContext";

const AIContentDialog = () => {
  const { 
    isAIDialogOpen, 
    closeAIDialog, 
    setAiGeneratedContent, 
    setSelectedPlatform,
    openAddPostDialog
  } = usePostContext();
  
  const [prompt, setPrompt] = useState<string>("");
  const [platform, setPlatform] = useState<string>("X");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (isAIDialogOpen) {
      setPrompt("");
      setGeneratedContent("");
      setPlatform("X");
    }
  }, [isAIDialogOpen]);

  const handleGenerateContent = async () => {
    if (!prompt) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Generating content for platform: ${platform} with prompt: ${prompt.substring(0, 30)}...`);
      // Convert platform to lowercase for API call
      const content = await generateAIContent(prompt, platform.toLowerCase());
      console.log(`Content generated (length: ${content.length})`);
      setGeneratedContent(content);
    } catch (error) {
      console.error("Error in handleGenerateContent:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const handleUseContent = () => {
    console.log(`Using content for platform: ${platform}`);
    
    // First close this dialog
    closeAIDialog();
    
    // Then set the content and platform in the context
    setAiGeneratedContent(generatedContent);
    setSelectedPlatform(platform);
    
    // Finally open the add post dialog
    setTimeout(() => {
      openAddPostDialog(generatedContent, platform);
    }, 100);
  };

  return (
    <Dialog open={isAIDialogOpen} onOpenChange={closeAIDialog}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            AI Content Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="X">X</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe what you want to generate, e.g., 'Write a post about our new product launch'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button 
            onClick={handleGenerateContent} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>

          {generatedContent && (
            <div className="mt-4 space-y-4">
              <Label>Generated Content</Label>
              <div className="relative">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[150px]"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={handleCopyContent}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleUseContent}>Use This Content</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeAIDialog}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIContentDialog;