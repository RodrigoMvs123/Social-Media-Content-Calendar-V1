import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("signup");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Redirect if already authenticated (but not during registration)
  useEffect(() => {
    console.log('🔍 REDIRECT CHECK:', { isAuthenticated, isRegistering });
    if (isAuthenticated && !isRegistering) {
      console.log('🔍 REDIRECTING TO DASHBOARD');
      navigate("/");
    } else {
      console.log('🔍 NOT REDIRECTING');
    }
  }, [isAuthenticated, navigate, isRegistering]);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    console.log("Login button clicked!");
    console.log("Attempting login with:", { email: loginEmail, password: loginPassword });
    
    try {
      await login(loginEmail, loginPassword);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
      console.error("Login error details:", error);
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 SIGNUP FORM SUBMITTED');
    setIsLoading(true);
    setIsRegistering(true);
    
    // Clear any existing auth tokens before registration
    localStorage.removeItem('auth_token');
    
    console.log("Attempting signup with:", { name: signupName, email: signupEmail });
    
    try {
      console.log('🚀 CALLING REGISTER FUNCTION');
      await register(signupEmail, signupPassword, signupName);
      console.log('🚀 REGISTER FUNCTION COMPLETED');
      
      console.log("Registration completed, user should NOT be authenticated");
      console.log("isAuthenticated after registration:", isAuthenticated);
      
      // Show success message
      toast({
        title: "Account created successfully",
        description: `Welcome ${signupName}! Please log in with your new credentials.`,
      });
      
      // Switch to login tab
      setTimeout(() => {
        setActiveTab("login");
      }, 100);
      setSignupEmail("");
      setSignupPassword("");
      setSignupName("");
      
    } catch (error) {
      console.error("Signup failed:", error);
      console.error("Signup error details:", error);
      toast({
        title: "Signup failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRegistering(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Social Media Content Calendar
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Plan and schedule your social media content
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            
              <TabsContent value="login">
                <CardContent className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your@email.com" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                      onClick={(e) => {
                        console.log("Button clicked directly!");
                        if (!loginEmail || !loginPassword) {
                          e.preventDefault();
                          alert("Please fill in both email and password");
                          return;
                        }
                      }}
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
                
              <TabsContent value="signup">
                <CardContent className="mt-4">
                  <form onSubmit={handleSignup} className="space-y-4" method="" action="">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        type="text" 
                        placeholder="John Doe" 
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="your@email.com" 
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </CardHeader>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              {activeTab === "login" 
                ? "Don't have an account? Click Sign Up above." 
                : "Already have an account? Click Login above."}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;