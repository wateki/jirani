import { Button } from "@/components/ui/button";
import { Menu, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">J</span>
            </div>
            <span className="text-xl font-bold text-foreground">Jirani</span>
          </div>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Benefits
            </a>
            <a href="#success" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Success Stories
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
              <Link to="/signup">Start Free Trial</Link>
            </Button>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}