import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Smartphone,
  Globe,
  Shield
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-white">J</span>
              </div>
              <span className="text-xl font-bold">Jirani</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
              The complete mobile-first business platform that lets you sell anything and everything fast. 
              Transform your business into a 24/7 automated selling machine.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-400">+254 700 123 456</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-400">hello@jirani.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-400">Nairobi, Kenya</span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-primary transition-colors">Mobile Store Builder</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Payment Processing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Inventory Management</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Analytics Dashboard</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Social Integration</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        {/* Features highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg p-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Mobile-First</h4>
              <p className="text-xs text-gray-400">Run everything from your phone</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg p-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Global Reach</h4>
              <p className="text-xs text-gray-400">Sell to customers worldwide</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg p-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Secure</h4>
              <p className="text-xs text-gray-400">Bank-level security</p>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <p className="text-sm text-gray-400">
              © 2024 Jirani Platform. All rights reserved.
            </p>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              Made in Kenya 🇰🇪
            </Badge>
          </div>

          {/* Social links */}
          <div className="flex items-center space-x-4">
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}