import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  Heart, 
  ShoppingBag, 
  User, 
  Menu,
  X,
  Store,
  Home,
  Grid3X3,
  InfoIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];

interface ModernStoreHeaderProps {
  storeName: string;
  primaryColor: string;
  storePath: string;
  cartItemsCount: number;
  onCartClick: () => void;
  collections?: Collection[];
  logoUrl?: string;
  currentPage?: 'home' | 'collections' | 'about' | 'product';
}

const ModernStoreHeader = ({ 
  storeName, 
  primaryColor, 
  storePath, 
  cartItemsCount,
  onCartClick,
  collections = [],
  logoUrl,
  currentPage = 'home'
}: ModernStoreHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { favoritesCount } = useFavorites();

  // Show top 5 collections for navigation
  const topCollections = collections.slice(0, 5);

  const navigationItems = [
    {
      label: 'Home',
      href: storePath,
      icon: Home,
      isActive: currentPage === 'home'
    },
    {
      label: 'Collections',
      href: `${storePath}/collections`,
      icon: Grid3X3,
      isActive: currentPage === 'collections'
    },
    {
      label: 'About',
      href: `${storePath}/about`,
      icon: InfoIcon,
      isActive: currentPage === 'about'
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // In a real app, you'd navigate to search results
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main header - more compact */}
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to={storePath} className="flex items-center space-x-2 flex-shrink-0">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={storeName}
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <Store 
                className="h-6 w-6" 
                style={{ color: primaryColor }}
              />
            )}
            <div 
              className="text-xl font-semibold tracking-tight"
              style={{ color: primaryColor }}
            >
              {storeName}
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`
                    flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${item.isActive 
                      ? 'text-white shadow-sm' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  style={item.isActive ? { 
                    backgroundColor: primaryColor,
                    color: 'white'
                  } : {}}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Collections Dropdown */}
            {topCollections.length > 0 && (
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span>Categories</span>
                </Button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    {topCollections.map((collection) => (
                      <Link
                        key={collection.id}
                        to={`${storePath}/collections/${collection.id}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        {collection.name}
                      </Link>
                    ))}
                    <Link
                      to={`${storePath}/collections`}
                      className="block px-4 py-2 text-sm font-medium text-gray-900 border-t border-gray-100 mt-1"
                      style={{ color: primaryColor }}
                    >
                      View All →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Search and Actions */}
          <div className="flex items-center space-x-2">
            {/* Search - Desktop */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 h-9 pr-10 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <Search className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </form>

            {/* Action Icons */}
            <div className="flex items-center space-x-1">
              <Link to={`${storePath}/favorites`}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-9 w-9 hover:bg-gray-100"
                  title="Favorites"
                >
                  <Heart className="h-4 w-4 text-gray-600" />
                  {favoritesCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hover:bg-gray-100"
                title="Account"
              >
                <User className="h-4 w-4 text-gray-600" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 hover:bg-gray-100"
                onClick={onCartClick}
                title="Shopping Cart"
              >
                <ShoppingBag className="h-4 w-4 text-gray-600" />
                {cartItemsCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </Badge>
                )}
              </Button>
              
              {/* Mobile Menu Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-9 w-9 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Menu"
              >
                {isMenuOpen ? (
                  <X className="h-4 w-4 text-gray-600" />
                ) : (
                  <Menu className="h-4 w-4 text-gray-600" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-3">
            <div className="space-y-1">
              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pr-10 text-sm"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                  >
                    <Search className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </form>

              {/* Mobile Navigation */}
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`
                      flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${item.isActive 
                        ? 'text-white' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                    style={item.isActive ? { 
                      backgroundColor: primaryColor,
                      color: 'white'
                    } : {}}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Mobile Collections */}
              {topCollections.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Categories
                  </div>
                  {topCollections.map((collection) => (
                    <Link
                      key={collection.id}
                      to={`${storePath}/collections/${collection.id}`}
                      className="block px-6 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {collection.name}
                    </Link>
                  ))}
                  <Link
                    to={`${storePath}/collections`}
                    className="block px-6 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                    style={{ color: primaryColor }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    View All Categories →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default ModernStoreHeader; 