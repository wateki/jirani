import { Header } from "./landing-page/Header";
import { HeroSection } from "./landing-page/HeroSection";
import { FeaturesSection } from "./landing-page/FeaturesSection";
import { SuccessSection } from "./landing-page/SuccessSection";
import { CTASection } from "./landing-page/CTASection";
import { Footer } from "./landing-page/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SuccessSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
