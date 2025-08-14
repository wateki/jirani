import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  ShoppingCart, 
  CreditCard, 
  Globe, 
  Package, 
  Share2,
  Zap,
  Clock,
  TrendingUp,
  Shield,
  Users,
  Rocket
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning-Fast Selling Machine",
    description: "Sell Anything, Everything, Anywhere",
    details: "Instant setup, universal product support, mobile-first selling, and 24/7 automated sales. Your business becomes a powerful selling machine that works while you sleep.",
    badge: "INSTANT",
    color: "text-orange-600"
  },
  {
    icon: ShoppingCart,
    title: "Real-Time Cart Intelligence",
    description: "Never Miss a Sale Again",
    details: "Live shopping sessions, abandoned cart recovery with 24-hour tracking, lost revenue analytics, and conversion optimization with instant notifications.",
    badge: "SMART",
    color: "text-blue-600"
  },
  {
    icon: CreditCard,
    title: "Instant Payment & Delivery System",
    description: "Sell, Deliver, Get Paid - FAST!",
    details: "Instant payment processing, M-Pesa and mobile money integration, automated delivery tracking, and real-time settlement within minutes.",
    badge: "SECURE",
    color: "text-green-600"
  },
  {
    icon: Globe,
    title: "Beautiful Websites in Minutes",
    description: "Fully Integrated Business System",
    details: "Instant website creation, drag-and-drop customization, fully integrated system with inventory and payments, mobile-optimized and SEO-ready.",
    badge: "FAST",
    color: "text-purple-600"
  },
  {
    icon: Package,
    title: "Smart Inventory & Supplier Management",
    description: "Automated Business Operations",
    details: "Automatic inventory refill, instant supplier orders, real-time stock tracking, automated reordering, and smart business loans when needed.",
    badge: "AUTO",
    color: "text-teal-600"
  },
  {
    icon: Share2,
    title: "Social Media & Marketplace Integration",
    description: "Amplify Your Reach",
    details: "Social media import, embedded store links, optimized social ads, built-in marketplace with location-based discovery and dual revenue streams.",
    badge: "SOCIAL",
    color: "text-pink-600"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Rocket className="w-3 h-3 mr-1" />
            Core Business Benefits
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to <span className="text-primary">Succeed</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From mobile-first selling to automated operations, Jirani provides all the tools 
            you need to transform your business into a modern commerce powerhouse.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50 hover:from-orange-50/50 hover:to-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-primary/10 group-hover:to-primary/20 transition-all duration-300`}>
                    <feature.icon className={`h-6 w-6 ${feature.color} group-hover:text-primary transition-colors duration-300`} />
                  </div>
                  <Badge variant="outline" className="text-xs font-medium">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </CardTitle>
                <p className="text-sm font-medium text-primary">
                  {feature.description}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.details}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-orange-100 px-6 py-3 rounded-full">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Setup takes less than 5 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
}