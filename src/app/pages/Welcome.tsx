import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Zap, Sparkles, Gift, ChevronRight } from "lucide-react";
import bgImage from "../../assets/background.png";

export function Welcome() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: Shield,
      title: "Swift. Reliable. Precise.",
      description: "Connect with trusted service providers in your area. All transactions protected by secure escrow.",
      color: "text-[#1E3A8A]",
      bgColor: "bg-blue-100",
    },
    {
      icon: Sparkles,
      title: "Dual-Currency Wallet",
      description: "Manage both GBP and LEUS coins seamlessly. Pay for services and earn rewards with our native currency.",
      color: "text-[#10B981]",
      bgColor: "bg-green-100",
    },
    {
      icon: Zap,
      title: "Loyalty Rewards",
      description: "Earn points with every transaction. Unlock higher tiers for better conversion rates and exclusive benefits.",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      icon: Gift,
      title: "Get Started Today",
      description: "Join LeaseUs and receive 50 LEUS coins as a welcome bonus. Start booking services right away!",
      color: "text-[#10B981]",
      bgColor: "bg-green-100",
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/signup");
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-between px-6 py-8 max-w-md mx-auto relative overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Backdrop Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/20"></div>

      {/* Slides */}
      <div className="flex-1 flex items-center justify-center w-full relative z-10 pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="text-center w-full"
          >
            <div className={`w-32 h-32 ${slides[currentSlide]?.bgColor || ''} rounded-full flex items-center justify-center mx-auto mb-8`}>
              {(() => {
                const Icon = slides[currentSlide]?.icon;
                return Icon ? <Icon className={`w-16 h-16 ${slides[currentSlide]?.color || ''}`} /> : null;
              })()}
            </div>
            <h2 
              className="text-3xl font-bold text-[#1E3A8A] mb-4" 
              style={{ 
                fontFamily: currentSlide === 0 ? 'Poppins, sans-serif' : 'Syne, sans-serif',
                fontStyle: currentSlide === 0 ? 'italic' : 'normal'
              }}
            >
              {slides[currentSlide]?.title}
            </h2>
            <p className="text-gray-700 text-base leading-relaxed px-4">
              {slides[currentSlide]?.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="w-full space-y-4 relative z-10">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-[#1E3A8A]"
                  : "w-2 bg-[#1E3A8A]/40"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <button
          onClick={handleNext}
          className="w-full bg-[#1E3A8A] text-white py-4 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2"
        >
          {currentSlide < slides.length - 1 ? "Next" : "Get Started"}
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          onClick={handleSkip}
          className="w-full text-[#1E3A8A] py-3 rounded-xl hover:bg-[#1E3A8A]/10 transition-colors"
        >
          {currentSlide < slides.length - 1 ? "Skip" : "Already have an account?"}
        </button>
      </div>
    </div>
  );
}


