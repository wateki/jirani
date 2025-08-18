import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface CustomerAuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isCustomer: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isCustomer, setIsCustomer] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Customer auth event:", event);
        console.log("Customer auth session:", currentSession);
        
        if (event === 'SIGNED_IN') {
          // Check if this is a customer user (not a business owner)
          checkIfCustomer(currentSession?.user);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // If user is already logged in, check if they're a customer
      if (currentSession?.user) {
        checkIfCustomer(currentSession.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to check if user is a customer (not a business owner)
  const checkIfCustomer = async (user: User | null | undefined) => {
    if (!user) {
      setIsCustomer(false);
      return;
    }
    
    try {
      // Check if user has a store (business owner)
      const { data: storeData, error: storeError } = await supabase
        .from('store_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (storeError) {
        console.error("Error checking for store:", storeError);
        return;
      }
      
      // If user has a store, they're a business owner, not a customer
      // If no store exists, they're a customer
      setIsCustomer(!storeData);
    } catch (error) {
      console.error("Error checking if user is customer:", error);
      setIsCustomer(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in to your customer account.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Customer sign in error:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            user_type: 'customer' // Mark as customer
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Customer sign up error:", error);
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setIsCustomer(false);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Customer sign out error:", error);
      toast({
        title: "Sign out failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    isCustomer
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
