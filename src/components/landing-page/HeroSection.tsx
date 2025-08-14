import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Smartphone, Zap, DollarSign, ShoppingCart, BarChart3, CreditCard, Package, TrendingUp, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function HeroSection() {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Preload the background image
    const img = new Image();
    img.src = "/heroImage.jpg";
    
    img.onload = () => {
      setTimeout(() => {
        setImageLoaded(true);
      }, 500);
    };

    img.onerror = () => {
      // If image fails to load, still show the section without background
      console.log("Background image failed to load");
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-100 py-20 sm:py-32">
      {/* Background Image with CSS */}
      <div 
        className={`absolute inset-0 -z-20 transition-opacity duration-1000 ease-out ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url('/heroImage.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
        
      {/* Gradient overlays for text readability */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/40 via-orange-50/30 to-orange-100/40"></div>
      
      {/* Additional gradient overlay that appears with image */}
      <div 
        className={`absolute inset-0 -z-10 bg-gradient-to-r from-white/50 via-orange-50/30 to-transparent transition-opacity duration-1000 ease-out ${
          imageLoaded ? 'opacity-100' : 'opacity-60'
        }`}
      ></div>

      {/* Animated background decorations */}
      <div className="absolute inset-0 -z-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 backdrop-blur-sm">
            <Zap className="w-3 h-3 mr-1" />
            The Complete Business Platform
          </Badge>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Run Your Business Online,{" "}
            
            <span className="text-primary">Anywhere</span> - FAST!
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your business into a 24/7 automated selling machine with instant payments, 
            automated inventory management, and beautiful websites that work from your phone. 
            <span className="font-semibold text-primary"> See it in action with our live demo store!</span>
          </p>

          {/* Key stats */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-white/40 px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-800">95% Payment Success</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-white/40 px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-800">5-Minute Setup</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-white/40 px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-800">24/7 Operations</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto border-primary/20 hover:bg-primary/5 bg-white/70 backdrop-blur-sm hover:backdrop-blur" asChild>
              <a href="https://jirani-mu.vercel.app/store/juice" target="_blank" rel="noopener noreferrer">
                View Live Demo Store
              </a>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="flex flex-col items-center p-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <Globe className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-center text-gray-800">Online Store</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-center text-gray-800">Instant Payments</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <Package className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-center text-gray-800">Auto Inventory</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-center text-gray-800">Smart Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}