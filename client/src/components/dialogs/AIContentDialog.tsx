import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, RefreshCw } from "lucide-react";
import { generateAIContent, generateContentIdeas } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AIContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContentSelected: (content: string) => void;
}

const AIContentDialog = ({ open, onOpenChange, onContentSelected }: AIContentDialogProps) => {
  const [activeTab, setActiveTab] = useState<string>("generate");
  const [prompt, setPrompt] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [platform, setPlatform] = useState<string>("twitter");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [contentIdeas, setContentIdeas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

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
      const content = await generateAIContent(prompt, platform);
      setGeneratedContent(content);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please enter a topic to generate ideas.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const ideas = await generateContentIdeas(topic);
      setContentIdeas(ideas);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate ideas. Please try again.",
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
    onContentSelected(generatedContent);
    onOpenChange(false);
  };

  const handleUseIdea = (idea: string) => {
    setPrompt(idea);
    setActiveTab("generate");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            AI Content Generator
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Content</TabsTrigger>
            <TabsTrigger value="ideas">Content Ideas</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
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
          </TabsContent>

          <TabsContent value="ideas" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <div className="flex space-x-2">
                <Input
                  id="topic"
                  placeholder="Enter a topic, e.g., 'product launch', 'company culture'"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Button 
                  onClick={handleGenerateIdeas}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </div>

            {contentIdeas.length > 0 && (
              <div className="mt-4">
                <Label>Content Ideas</Label>
                <div className="mt-2 space-y-2">
                  {contentIdeas.map((idea, index) => (
                    <div 
                      key={index} 
                      className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleUseIdea(idea)}
                    >
                      <p className="text-sm">{idea}</p>
                      <Button size="sm" variant="ghost">Use</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIContentDialog;