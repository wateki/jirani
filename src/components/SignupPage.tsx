import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, User, Mail, Lock, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BusinessType, StoreTemplate, RegistrationData } from "@/types/database";
import { BusinessTypeStep } from "./registration/steps/BusinessTypeStep";
import { TemplateSelectionStep } from "./registration/steps/TemplateSelectionStep";
import { BusinessDetailsStep } from "./registration/steps/BusinessDetailsStep";
import { ReviewAndConfirmStep } from "./registration/steps/ReviewAndConfirmStep";

const SignupPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [isBusinessDetailsValid, setIsBusinessDetailsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [registrationFinished, setRegistrationFinished] = useState(false);
  const { signUpEnhanced, session } = useAuth();
  const navigate = useNavigate();

  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    name: "",
    email: "",
    password: "",
    businessName: "",
    businessType: null,
    template: null,
    currentStep: 1,
    agreedToPrivacyPolicy: false,
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Use useEffect for redirection
  useEffect(() => {
    if (session && registrationFinished) {
      navigate("/dashboard");
    }
  }, [session, registrationFinished, navigate]);

  // Fetch business types and templates
  useEffect(() => {
    fetchBusinessTypes();
  }, []);

  const fetchBusinessTypes = async () => {
    try {
      const { data: businessTypesData, error: businessTypesError } = await supabase
        .from('business_types')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (businessTypesError) throw businessTypesError;
      setBusinessTypes(businessTypesData || []);

      const { data: templatesData, error: templatesError } = await supabase
        .from('store_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates((templatesData || []) as StoreTemplate[]);
    } catch (error) {
      console.error('Error fetching business types and templates:', error);
    }
  };

  const handleNext = async () => {
    // Clear previous messages
    setErrorMessage("");
    setSuccessMessage("");

    if (currentStep === 1) {
      // Step 1: Basic signup with just name, email, password
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: registrationData.email,
          password: registrationData.password,
          options: {
            data: {
              name: registrationData.name,
            }
          }
        });

        if (error) {
          setErrorMessage(error.message || "Failed to create account. Please try again.");
          setIsLoading(false);
          return;
        }
        
        // Ensure account was actually created
        if (!data?.user?.id) {
          setErrorMessage("Account creation failed. Please try again.");
          setIsLoading(false);
          return;
        }

        // Show success message
        setSuccessMessage("Account created successfully! Please check your email to verify your account.");

        // First stop loading, then advance to next step
        setIsLoading(false);

        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setRegistrationData(prev => ({ ...prev, currentStep: nextStep }));
      } catch (error: any) {
        console.error('Signup error:', error);
        setErrorMessage(error.message || "An unexpected error occurred. Please try again.");
        setIsLoading(false);
        // Don't proceed to next step if signup fails
      }
    } else if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setRegistrationData(prev => ({ ...prev, currentStep: nextStep }));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setRegistrationData(prev => ({ ...prev, currentStep: prevStep }));
    }
  };

  const handleStepData = (stepData: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...stepData }));
    // Clear messages when user makes changes
    if (errorMessage || successMessage) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleCompleteRegistration = async () => {
    // Clear previous messages
    setErrorMessage("");
    setSuccessMessage("");

    // Check if business details are valid (slug is available)
    if (currentStep === 4 && !isBusinessDetailsValid) {
      setErrorMessage("Store URL is not available. Please choose a different store name.");
      return;
    }

    setIsLoading(true);
    try {
      // Create the store now (final step), owned by the authenticated user
      if (session?.user) {
        const { error } = await supabase
          .from('store_settings')
          .insert({
            user_id: session.user.id,
            store_name: registrationData.businessName,
            business_type_id: registrationData.businessType?.id,
            template_id: registrationData.template?.id,
            is_published: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          setErrorMessage(error.message || "Failed to create store settings. Please try again.");
          setIsLoading(false);
          return;
        }
      }
      
      setSuccessMessage("Registration completed successfully! Redirecting to your dashboard...");
      setRegistrationFinished(true);
      // User will be redirected by the auth context
    } catch (error: any) {
      console.error('Registration completion error:', error);
      setErrorMessage(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error(`${provider} login error:`, error);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Create Your Account";
      case 2: return "Choose Your Business Type";
      case 3: return "Select Your Template";
      case 4: return "Business Details";
      case 5: return "Review & Launch";
      default: return "Sign Up";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Get started with your Jirani store in minutes";
      case 2: return "What type of business are you running?";
      case 3: return "Pick a template that fits your business";
      case 4: return "Tell us more about your business";
      case 5: return "Review your information and launch your store";
      default: return "Complete your registration";
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return registrationData.name && registrationData.email && registrationData.password && registrationData.agreedToPrivacyPolicy;
      case 2:
        return registrationData.businessType !== null;
      case 3:
        return registrationData.template !== null;
      case 4:
        return registrationData.businessName.trim().length > 0 && isBusinessDetailsValid;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Basic Info Form */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="John Doe" 
                  value={registrationData.name}
                  onChange={(e) => handleStepData({ name: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={registrationData.email}
                  onChange={(e) => handleStepData({ email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={registrationData.password}
                  onChange={(e) => handleStepData({ password: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Must be at least 8 characters and include a number and a special character
              </p>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={registrationData.agreedToPrivacyPolicy}
                  onChange={(e) => handleStepData({ agreedToPrivacyPolicy: e.target.checked })}
                  required
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-600">
                  I agree to the{" "}
                  <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <BusinessTypeStep
            data={registrationData}
            onDataChange={handleStepData}
            businessTypes={businessTypes}
          />
        );
      case 3:
        return (
          <TemplateSelectionStep
            data={registrationData}
            onDataChange={handleStepData}
            templates={templates}
          />
        );
      case 4:
        return (
          <BusinessDetailsStep
            data={registrationData}
            onDataChange={handleStepData}
            onValidationChange={setIsBusinessDetailsValid}
          />
        );
      case 5:
        return (
          <ReviewAndConfirmStep
            data={registrationData}
            onConfirm={handleCompleteRegistration}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center">
            <ShoppingBag className="h-8 w-8 text-orange-500 mr-2" />
            <span className="text-2xl font-bold">Jirani</span>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>
              {getStepDescription()}
            </CardDescription>
          </CardHeader>
          
          {/* Error and Success Messages */}
          {errorMessage && (
            <div className="px-6">
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}
          
          {successMessage && (
            <div className="px-6">
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            </div>
          )}
          
          <CardContent className="min-h-[400px]">
            {renderStep()}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {/* Navigation Buttons */}
            {currentStep < 5 && (
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  className="flex items-center"
                >
                  {currentStep === 1 ? (isLoading ? "Creating Account..." : "Create Account") : "Next"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Social Login - Only show on first step */}
            {currentStep === 1 && (
              <>
                <div className="text-center text-sm text-gray-500">
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign in
                  </Link>
                </div>
                
               {/*  <div className="space-y-4 w-full">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('google')}>
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                      </svg>
                      Google
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('apple')}> 
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
                      </svg>
                      Apple
                    </Button>
                  </div>
                </div> */}
              </>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Benefits Section - Only show on first step */}
      {currentStep === 1 && (
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Why choose Jirani?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-600">
                  <Check className="h-5 w-5" />
                </div>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-medium">Free 14-day trial</h4>
                <p className="text-xs text-gray-500">No credit card required</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-600">
                  <Check className="h-5 w-5" />
                </div>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-medium">Business templates</h4>
                <p className="text-xs text-gray-500">Pre-configured for your industry</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-600">
                  <Check className="h-5 w-5" />
                </div>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-medium">Local payment options</h4>
                <p className="text-xs text-gray-500">Including M-Pesa support</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignupPage;
