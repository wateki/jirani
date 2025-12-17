import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogIn, LogOut } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Store } from "lucide-react";

const MarketplaceHeader = () => {
  const { user, isCustomer, signOut } = useCustomerAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/marketplace" className="flex items-center space-x-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-primary">Jirani</span>
          </Link>

          {/* Right side - Auth buttons */}
          <div className="flex items-center space-x-3">
            {user && isCustomer ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-600">
                  Hi, {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-gray-50"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-gray-300"
                  asChild
                >
                  <Link to="/marketplace/profile">
                    <User className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Link to="/customer/login?returnUrl=/marketplace">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Log in
                  </Button>
                </Link>
                <Link to="/customer/login?returnUrl=/marketplace">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MarketplaceHeader;

