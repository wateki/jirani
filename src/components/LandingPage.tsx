
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  ChevronRight, 
  ShoppingBag, 
  Palette, 
  CreditCard, 
  BarChart, 
  Gift, 
  Search, 
  Store, 
  Package, 
  PhoneCall, 
  Phone, 
  ShieldCheck, 
  Users 
} from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with East African inspired pattern */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Store className="h-8 w-8 text-primary mr-2" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">BiasharaBuilder</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">Pricing</a>
            <a href="#faq" className="text-gray-600 hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section with gradient and cultural pattern */}
      <section className="pattern-bg bg-gradient-to-r from-purple-50 to-orange-50 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary mb-4">
                For Small Businesses in East Africa
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Build Your Online Store <span className="text-primary">In Minutes</span>
              </h1>
              <p className="text-lg text-gray-700 mb-8">
                A complete platform for small businesses to create beautiful online stores, 
                manage inventory, process payments including M-Pesa, and grow their business locally and beyond.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <Link to="/signup">Start Building <ChevronRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
                  <Link to="/demo">See Demo</Link>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative">
                <div className="absolute -top-6 -left-6 w-full h-full bg-accent/20 rounded-lg"></div>
                <img 
                  src="/lovable-uploads/6c799b61-bc0c-414d-abfa-06eb3d07a50e.png" 
                  alt="Store customization interface" 
                  className="rounded-lg shadow-xl relative z-10" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by section */}
      <section className="py-10 bg-white">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 mb-8">Trusted by businesses all across East Africa</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary mb-4">
              Features
            </div>
            <h2 className="text-3xl font-bold mb-4">Built for Local Business Success</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools required to build, customize, and manage your online store with local payment options.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Palette className="h-12 w-12 text-primary" />}
              title="Custom Storefronts"
              description="Build a store that matches your brand with easy customization tools for colors, text, and images."
            />
            <FeatureCard 
              icon={<Package className="h-12 w-12 text-primary" />}
              title="Inventory Management"
              description="Track stock levels, receive alerts, and manage your products with our easy-to-use system."
            />
            <FeatureCard 
              icon={<PhoneCall className="h-12 w-12 text-primary" />}
              title="M-Pesa Integration"
              description="Accept payments via M-Pesa, bank transfers, and other local payment methods your customers prefer."
            />
            <FeatureCard 
              icon={<BarChart className="h-12 w-12 text-primary" />}
              title="Business Analytics"
              description="Get insights into your sales, customer behavior, and inventory performance to grow your business."
            />
            <FeatureCard 
              icon={<ShieldCheck className="h-12 w-12 text-primary" />}
              title="Secure & Reliable"
              description="Your business and customer data is always protected with our enterprise-grade security."
            />
            <FeatureCard 
              icon={<Phone className="h-12 w-12 text-primary" />}
              title="Mobile Optimized"
              description="All stores are fully responsive and work perfectly on smartphones where most of your customers shop."
            />
          </div>
        </div>
      </section>

      {/* Customization showcase with local context */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary mb-4">
              Customization
            </div>
            <h2 className="text-3xl font-bold mb-4">Your Store, Your Style</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Customize every aspect of your online store to reflect your brand identity and connect with local customers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-white p-6 rounded-lg shadow-lg mb-6 gradient-border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Store Branding</h3>
                <p className="text-gray-600 mb-4">
                  Create compelling headlines and descriptions that resonate with your local customers.
                </p>
                <img 
                  src="/lovable-uploads/f47f36e1-69a0-4001-9909-0e1e71b97a47.png" 
                  alt="Hero text customization" 
                  className="rounded-lg border"
                />
              </div>
            </div>
            <div>
              <div className="bg-white p-6 rounded-lg shadow-lg mb-6 gradient-border">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Visual Customization</h3>
                <p className="text-gray-600 mb-4">
                  Choose colors and styles that reflect your brand and appeal to your target market.
                </p>
                <img 
                  src="/lovable-uploads/fe6a61da-deb6-47b8-81c4-6edc677f495c.png" 
                  alt="Button styling options" 
                  className="rounded-lg border"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial section */}
      <section className="py-20 pattern-bg">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary mb-4">
              Testimonials
            </div>
            <h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                <div>
                  <p className="font-semibold">Sarah Kimani</p>
                  <p className="text-sm text-gray-500">Clothing Store Owner</p>
                </div>
              </div>
              <p className="text-gray-600">
                "BiasharaBuilder helped me take my small clothing business online. The M-Pesa integration made it easy for my customers to pay, and sales have increased by 40%!"
              </p>
            </Card>
            
            <Card className="p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                <div>
                  <p className="font-semibold">David Omondi</p>
                  <p className="text-sm text-gray-500">Electronics Shop</p>
                </div>
              </div>
              <p className="text-gray-600">
                "Managing inventory was a nightmare before. Now I can track everything in one place and never oversell products. The platform is so easy to use!"
              </p>
            </Card>
            
            <Card className="p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                <div>
                  <p className="font-semibold">Grace Muthoni</p>
                  <p className="text-sm text-gray-500">Handcraft Business</p>
                </div>
              </div>
              <p className="text-gray-600">
                "I was able to customize my store to showcase our traditional crafts beautifully. Now we're selling to customers across East Africa and beyond!"
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA section with local context */}
      <section className="bg-gradient-to-r from-primary to-accent text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Grow Your Business Online?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join hundreds of successful businesses across East Africa already using BiasharaBuilder.
          </p>
          <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-100" asChild>
            <Link to="/signup">Start Your Free Trial</Link>
          </Button>
          <p className="mt-4 text-white/80 text-sm">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Simple pricing section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary mb-4">
              Pricing
            </div>
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Affordable plans designed for small businesses at any stage.
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8 justify-center max-w-5xl mx-auto">
            <Card className="p-6 flex-1 border-2 border-gray-200">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-gray-500 mb-4">For new businesses</p>
              <p className="text-4xl font-bold mb-6">KSh 2,500<span className="text-base font-normal text-gray-500">/month</span></p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Up to 50 products</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Basic customization</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>M-Pesa payments</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Email support</span>
                </li>
              </ul>
              
              <Button className="w-full" variant="outline">Choose Plan</Button>
            </Card>
            
            <Card className="p-6 flex-1 border-2 border-primary relative">
              <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-sm rounded-bl-lg rounded-tr-lg">Popular</div>
              <h3 className="text-xl font-bold mb-2">Growth</h3>
              <p className="text-gray-500 mb-4">For expanding businesses</p>
              <p className="text-4xl font-bold mb-6">KSh 5,000<span className="text-base font-normal text-gray-500">/month</span></p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Unlimited products</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Full customization</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>All payment methods</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-primary mr-2" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              
              <Button className="w-full bg-primary hover:bg-primary/90">Choose Plan</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary mb-4">
              FAQ
            </div>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="max-w-3xl mx-auto grid gap-6">
            <FaqItem 
              question="How do I get started with BiasharaBuilder?"
              answer="Simply sign up for a free 14-day trial. No credit card required. You can build your store, add products, and customize everything before deciding on a plan."
            />
            <FaqItem 
              question="Can I accept M-Pesa payments on my store?"
              answer="Yes! We have full integration with M-Pesa and other local payment methods to make it easy for your customers to purchase your products."
            />
            <FaqItem 
              question="Do I need technical skills to use BiasharaBuilder?"
              answer="Not at all! Our platform is designed to be user-friendly. If you can use social media, you can build and manage your online store with BiasharaBuilder."
            />
            <FaqItem 
              question="Can I sell both physical and digital products?"
              answer="Yes, BiasharaBuilder supports both physical products that need shipping and digital products like e-books or courses that can be delivered instantly."
            />
            <FaqItem 
              question="Is there a limit to how many products I can sell?"
              answer="The Starter plan allows up to 50 products, while the Growth plan includes unlimited products for growing businesses."
            />
          </div>
        </div>
      </section>

      {/* Footer with East African context */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Store className="h-6 w-6 text-accent mr-2" />
                <span className="text-lg font-bold">BiasharaBuilder</span>
              </div>
              <p className="text-gray-400">
                Empowering East African businesses with powerful e-commerce tools.
              </p>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
                <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <PhoneCall className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <span className="text-gray-400">+254 700 123 456</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-400">support@biasharabuilder.com</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-gray-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-400">Westlands, Nairobi, Kenya</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} BiasharaBuilder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Card className="p-6 h-full hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  );
};

const FaqItem = ({ question, answer }: {
  question: string;
  answer: string;
}) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </Card>
  );
};

export default LandingPage;
