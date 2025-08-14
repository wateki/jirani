import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, Smartphone, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-orange-600 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
            <Clock className="w-3 h-3 mr-1" />
            14-Day Free Trial
          </Badge>

          {/* Main headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of businesses already using Jirani to sell more, 
            automate operations, and grow faster than ever before. 
            <span className="font-semibold">Experience the platform firsthand with our live demo store!</span>
          </p>

          {/* Benefits list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex items-center justify-center space-x-3 bg-white/10 backdrop-blur rounded-xl p-4">
              <CheckCircle className="h-5 w-5 text-white flex-shrink-0" />
              <span className="text-white font-medium">Free 14-day trial</span>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-white/10 backdrop-blur rounded-xl p-4">
              <CheckCircle className="h-5 w-5 text-white flex-shrink-0" />
              <span className="text-white font-medium">5-minute setup</span>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-white/10 backdrop-blur rounded-xl p-4">
              <CheckCircle className="h-5 w-5 text-white flex-shrink-0" />
              <span className="text-white font-medium">No credit card required</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6 h-auto font-semibold shadow-lg"
              asChild
            >
              <Link to="/signup">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 h-auto border-white/30 text-white hover:bg-white/10 backdrop-blur"
              asChild
            >
              <a href="https://jirani-mu.vercel.app/store/juice" target="_blank" rel="noopener noreferrer">
                View Live Demo Store
              </a>
            </Button>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4" />
              <span className="text-sm">Mobile-First Platform</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Instant Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}