import { Link } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Box,
  DollarSign,
  Store,
  Menu,
} from "lucide-react";
import { OutletSelector } from "@/components/outlet-selector";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <img src="/assets/jirani-logo.svg" alt="Jirani" className="h-8 w-8 mr-2" />
                <span className="font-bold text-lg text-orange-500">Jirani</span>
              </div>
              <div className="block md:hidden">
                <SidebarTrigger />
              </div>
            </div>
            <div className="px-4 pb-2">
              <OutletSelector />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link to="/dashboard">
                    <Home className="h-4 w-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Customize Store">
                    <Link to="/dashboard/customize">
                      <Settings className="h-4 w-4" />
                      <span>Customize Store</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="My Products">
                  <Package className="h-4 w-4" />
                  <span>My Products</span>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/dashboard/products?tab=items">Items</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/dashboard/products?tab=collections">Collections</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Sales">
                    <ShoppingCart className="h-4 w-4" />
                  <span>Sales</span>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/dashboard/orders">Orders</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link to="/dashboard/payouts">Payouts</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Outlets">
                  <Link to="/dashboard/outlets">
                    <Store className="h-4 w-4" />
                    <span>Outlets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Deliveries">
                  <Link to="/dashboard/deliveries">
                    <Box className="h-4 w-4" />
                    <span>Deliveries</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarGroup>
              <SidebarGroupLabel>Personalization</SidebarGroupLabel>
              <SidebarMenu>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Account Settings">
                    <Link to="/dashboard/account">
                      <Users className="h-4 w-4" />
                      <span>Account Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="md:hidden flex items-center mb-4">
            <SidebarTrigger className="mr-2" />
            <span className="font-bold text-lg">Jirani</span>
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
