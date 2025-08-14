import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Clock, Shield, Zap, Globe } from "lucide-react";

const metrics = [
  {
    icon: TrendingUp,
    value: "95%",
    label: "Payment Success Rate",
    description: "Industry-leading payment processing reliability",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: Users,
    value: "40%",
    label: "Average Cart Recovery",
    description: "Significant improvement in abandoned cart recovery",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: Clock,
    value: "60%",
    label: "Faster Setup",
    description: "Compared to traditional e-commerce platforms",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: Zap,
    value: "80%",
    label: "Mobile Conversion",
    description: "Optimized for mobile-first customers",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Shield,
    value: "5-Min",
    label: "Store Creation",
    description: "Build beautiful websites in minutes",
    color: "text-teal-600",
    bgColor: "bg-teal-100"
  },
  {
    icon: Globe,
    value: "24/7",
    label: "Operations",
    description: "Your business never sleeps - automated selling",
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  }
];

export function SuccessSection() {
  return (
    <section id="success" className="py-20 bg-gradient-to-br from-gray-50 to-orange-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <TrendingUp className="w-3 h-3 mr-1" />
            Proven Results
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Success <span className="text-primary">Metrics</span> That Matter
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of businesses that have transformed their operations 
            and boosted their revenue with Jirani's powerful platform.
          </p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {metrics.map((metric, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl ${metric.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <metric.icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-2xl font-bold ${metric.color} mb-1`}>
                      {metric.value}
                    </div>
                    <div className="font-semibold text-gray-900 mb-2">
                      {metric.label}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {metric.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scalability highlights */}
        <div className="bg-white/60 backdrop-blur rounded-2xl p-8 border border-orange-100">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Built for <span className="text-primary">Scalability</span>
            </h3>
            <p className="text-gray-600">
              Our platform grows with your business, from startup to enterprise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-primary">∞</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Sell Anything</h4>
              <p className="text-sm text-gray-600">No limits on what you can sell</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Global Reach</h4>
              <p className="text-sm text-gray-600">Serve customers anywhere</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Automated Growth</h4>
              <p className="text-sm text-gray-600">System grows with you automatically</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">24/7 Operations</h4>
              <p className="text-sm text-gray-600">Never miss a sale opportunity</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}