import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Star, 
  Users, 
  Award, 
  Globe, 
  Shield, 
  Truck, 
  CreditCard, 
  RefreshCw, 
  Leaf,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Heart,
  CheckCircle
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernCartSidebar from "./ModernCartSidebar";

type Collection = Database['public']['Tables']['categories']['Row'];

interface ModernAboutPageProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: Database['public']['Tables']['store_settings']['Row'];
  storeSlug?: string;
}

const ModernAboutPage = ({ primaryColor, secondaryColor, storeName, storeSettings, storeSlug }: ModernAboutPageProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const storePath = location.pathname.split('/about')[0] || '';
  const { getCartItemsCount } = useCart();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const cartItemsCount = getCartItemsCount();

  // Fetch collections for navigation
  useEffect(() => {
    async function fetchCollections() {
      if (!storeSlug) return;
      
      try {
        // Get store ID
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('id')
          .eq('store_slug', storeSlug)
          .single();
        
        if (storeError || !storeData) return;

        // Fetch collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeData.id)
          .order('name');
        
        if (!collectionsError) {
          setCollections(collectionsData || []);
        }
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    }

    fetchCollections();
  }, [storeSlug]);

  return (
    <div className="min-h-screen bg-white font-inter">
      <ModernStoreHeader
        storeName={storeName}
        primaryColor={primaryColor}
        logoUrl={storeSettings?.logo_url}
        storePath={storePath}
        cartItemsCount={cartItemsCount}
        onCartClick={() => setIsCartOpen(true)}
        collections={collections}
        currentPage="about"
      />

      {/* Hero Section */}
      <section 
        className="relative text-white py-12 md:py-20 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`
        }}
      >
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold leading-tight mb-4 md:mb-6">
              About {storeName}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto opacity-90 mb-6 md:mb-8">
              {storeSettings?.store_description || 
               "Your trusted partner for quality products and exceptional service"}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="text-white font-semibold px-6 md:px-8 py-3 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
                onClick={() => navigate(`${storePath}/collections`)}
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-gray-900 font-semibold px-6 md:px-8 py-3 rounded-lg"
                onClick={() => navigate(`${storePath}`)}
              >
                Visit Store
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 opacity-10">
          <div 
            className="w-full h-full rounded-full"
            style={{ backgroundColor: secondaryColor || 'white' }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-24 h-24 md:w-48 md:h-48 opacity-10">
          <div 
            className="w-full h-full rounded-full"
            style={{ backgroundColor: secondaryColor || 'white' }}
          />
        </div>
      </section>

      {/* Our Story */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
                Our Story
              </h2>
              <div className="space-y-4 md:space-y-6 text-gray-600 leading-relaxed">
                <p className="text-base md:text-lg">
                  Founded with a vision to create exceptional shopping experiences, {storeName} has grown into a trusted destination for quality products and outstanding customer service.
                </p>
                <p className="text-base md:text-lg">
                  We believe in the power of community and the importance of building lasting relationships with our customers. Every product we offer is carefully selected to meet our high standards of quality and value.
                </p>
                <p className="text-base md:text-lg">
                  Our commitment goes beyond just selling products – we're dedicated to providing solutions that enhance your lifestyle and bring joy to your everyday experiences.
                </p>
              </div>
              
              <div className="mt-6 md:mt-8 flex flex-wrap gap-4">
                <Badge 
                  className="text-white px-4 py-2 text-sm md:text-base"
                  style={{ backgroundColor: primaryColor }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Quality Guaranteed
                </Badge>
                <Badge 
                  className="text-white px-4 py-2 text-sm md:text-base"
                  style={{ backgroundColor: secondaryColor || primaryColor }}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Customer First
                </Badge>
              </div>
            </div>
            
            <div className="order-1 lg:order-2 relative">
              <div className="relative max-w-md mx-auto lg:max-w-none">
                <div 
                  className="absolute inset-0 rounded-2xl transform rotate-3"
                  style={{ backgroundColor: `${primaryColor}20` }}
                />
                <img
                  src={storeSettings?.banner_url || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"}
                alt="Our story"
                  className="relative w-full aspect-[4/3] object-cover rounded-2xl shadow-xl"
              />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do and shape our commitment to excellence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Award className="w-8 h-8 md:w-10 md:h-10" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Quality First</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                We partner with trusted suppliers to ensure every product meets our high standards of quality and authenticity.
              </p>
            </div>

            <div className="text-center bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Users className="w-8 h-8 md:w-10 md:h-10" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Customer Focused</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Our customers are at the heart of everything we do. We listen, adapt, and continuously improve their experience.
              </p>
            </div>

            <div className="text-center bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Leaf className="w-8 h-8 md:w-10 md:h-10" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Sustainability</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                We're committed to sustainable practices and supporting eco-friendly products and packaging solutions.
              </p>
            </div>

            <div className="text-center bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Shield className="w-8 h-8 md:w-10 md:h-10" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Trust & Security</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Your security is our priority. We use advanced encryption and secure payment methods to protect your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section 
        className="py-12 md:py-20 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`
        }}
      >
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              Our Impact
            </h2>
            <p className="text-base md:text-lg opacity-90">
              Numbers that tell our story of growth and customer satisfaction
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">1K+</div>
              <div className="text-sm md:text-base opacity-80">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">500+</div>
              <div className="text-sm md:text-base opacity-80">Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">50+</div>
              <div className="text-sm md:text-base opacity-80">Collections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">24/7</div>
              <div className="text-sm md:text-base opacity-80">Support</div>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5">
          <div className="w-full h-full border-4 border-white rounded-full" />
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose {storeName}?
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              We're more than just a store – we're your trusted partner in finding exactly what you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <Truck className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Quick and reliable delivery with real-time tracking to keep you informed every step of the way.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Secure Payments</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Multiple secure payment options to ensure your transactions are safe and convenient.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Easy Returns</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                Hassle-free returns and exchanges with our customer-friendly return policy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Ready to Start Shopping?
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8">
              Explore our collections and discover amazing products that suit your style and needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="text-white font-semibold px-6 md:px-8 py-3 text-base md:text-lg rounded-lg"
                style={{ backgroundColor: primaryColor }}
                onClick={() => navigate(`${storePath}/collections`)}
              >
                Browse Collections
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline"
                className="border-2 font-semibold px-6 md:px-8 py-3 text-base md:text-lg rounded-lg"
                style={{ 
                  borderColor: primaryColor, 
                  color: primaryColor 
                }}
                onClick={() => navigate(`${storePath}`)}
              >
                Visit Homepage
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Consistent with ModernStoreTemplate */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Shop by Category</h3>
              <ul className="space-y-1 md:space-y-2 text-gray-300 text-sm md:text-base">
                {collections.slice(0, 4).map((collection) => (
                  <li key={collection.id}>
                    <Link 
                      to={`${storePath}/collections/${collection.id}`}
                      className="hover:text-white transition-colors"
                    >
                      {collection.name}
                    </Link>
                  </li>
                ))}
                {collections.length === 0 && (
                  <li>
                    <Link 
                      to={`${storePath}/collections`}
                      className="hover:text-white transition-colors"
                    >
                      View All Products
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">About</h3>
              <ul className="space-y-1 md:space-y-2 text-gray-300 text-sm md:text-base">
                <li><Link to={`${storePath}/about`} className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to={`${storePath}`} className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to={`${storePath}`} className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Policy</h3>
              <ul className="space-y-1 md:space-y-2 text-gray-300 text-sm md:text-base">
                <li><Link to="#" className="hover:text-white transition-colors">Return Policy</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Terms of Use</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <div className="text-gray-300 text-sm md:text-base">
                <p className="mb-2">🇰🇪 Kenya</p>
                <p className="text-xs md:text-sm">© 2024 | {storeName}. All Rights Reserved</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <ModernCartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        primaryColor={primaryColor}
        storePath={storePath}
      />
    </div>
  );
};

export default ModernAboutPage; 