import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShoppingBag, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { BasicInfoStep } from "./steps/BasicInfoStep";
import { BusinessTypeStep } from "./steps/BusinessTypeStep";
import { TemplateSelectionStep } from "./steps/TemplateSelectionStep";
import { BusinessDetailsStep } from "./steps/BusinessDetailsStep";
import { ReviewAndConfirmStep } from "./steps/ReviewAndConfirmStep";

import { RegistrationData, BusinessType, StoreTemplate } from "@/types/database";

const RegistrationFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const { session, signUpEnhanced } = useAuth();
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

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

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
      setTemplates(
        (templatesData || []).map(t => ({
          ...t,
          template_config: typeof t.template_config === "string"
            ? JSON.parse(t.template_config)
            : t.template_config
        }))
      );
    } catch (error) {
      console.error('Error fetching business types and templates:', error);
    }
  };

  const handleNext = async () => {
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

        if (error) throw error;
        
        // Ensure account was actually created
        if (!data?.user?.id) {
          setIsLoading(false);
          return;
        }

        // First stop loading, then advance to next step
        setIsLoading(false);

        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setRegistrationData(prev => ({ ...prev, currentStep: nextStep }));
      } catch (error) {
        console.error('Signup error:', error);
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
  };

  const handleCompleteRegistration = async () => {
    setIsLoading(true);
    try {
      // Create store settings with all business details
      if (session?.user) {
        const { error } = await supabase
          .from('store_settings')
          .insert({
            user_id: session.user.id,
            store_name: registrationData.businessName,
            business_type_id: registrationData.businessType?.id,
            template_id: registrationData.template?.id,
            is_published: false, // Start as unpublished
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
      
      console.log('Registration completed successfully');
      // User will be redirected by the auth context
    } catch (error) {
      console.error('Registration completion error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Create Your Account";
      case 2: return "Business Type";
      case 3: return "Choose Template";
      case 4: return "Business Details";
      case 5: return "Review & Complete";
      default: return "Registration";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Create your account to get started";
      case 2: return "What type of business are you running?";
      case 3: return "Pick a template that fits your business";
      case 4: return "Tell us more about your business";
      case 5: return "Review your information and complete setup";
      default: return "Complete your registration";
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return registrationData.name.trim() !== "" && 
               registrationData.email.trim() !== "" && 
               registrationData.password.length >= 6 &&
               registrationData.agreedToPrivacyPolicy;
      case 2:
        return registrationData.businessType !== null;
      case 3:
        return registrationData.template !== null;
      case 4:
        return registrationData.businessName.trim() !== "";
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
          <BasicInfoStep
            data={registrationData}
            onDataChange={handleStepData}
          />
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
            templates={templates.filter(t => t.business_type_id === registrationData.businessType?.id)}
          />
        );
      case 4:
        return (
          <BusinessDetailsStep
            data={registrationData}
            onDataChange={handleStepData}
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
        
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="mb-4" />
            <CardTitle className="text-xl">{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          
          <CardContent className="min-h-[400px]">
            {renderStep()}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNext() || isLoading}
              >
                {currentStep === 1 ? (isLoading ? "Creating Account..." : "Create Account") : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCompleteRegistration}
                disabled={!canProceedToNext() || isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Creating Account..." : "Complete Registration"}
              </Button>
            )}
          </CardFooter>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFlow; 