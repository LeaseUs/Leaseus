import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Gift, Building2 } from "lucide-react";
import bgImage from "../../assets/background.png";

export function Splash() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    localStorage.removeItem("hasSeenWelcome");
    navigate("/welcome");
  };

  const handleSignIn = () => {
    navigate("/login");
  };

  const handleGetBonus = () => {
    localStorage.setItem("claimBonus", "true");
    navigate("/signup");
  };

  const handlePartnerRegister = () => {
    navigate("/partner/register");
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
      {/* Spacer — zebra occupies roughly top 60% of screen */}
      <div style={{ flex: '0 0 60vh' }}></div>

      {/* Bottom Section */}
      <div className="w-full space-y-4 pb-4">

        {/* LeaseUs Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-6xl font-bold text-center"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          <span className="text-[#1E3A8A]">Lease</span><span className="text-[#10B981]">Us</span>
        </motion.h1>

        {/* Get 50 LEUS Free Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          onClick={handleGetBonus}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#10B981] text-[#10B981] bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all mx-auto"
        >
          <Gift className="w-4 h-4" />
          <span className="font-medium text-sm">Get 50 LEUS Free</span>
        </motion.button>

        {/* Pagination Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex gap-2 justify-center"
        >
          <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full flex gap-3 pt-2"
        >
          <button
            onClick={handleGetStarted}
            className="flex-1 bg-[#10B981] text-[#0a0a0a] font-bold py-5 rounded-2xl hover:bg-[#0ea872] transition-colors text-lg"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Get Started
          </button>

          <button
            onClick={handleSignIn}
            className="flex-1 bg-[#1a1a1a] text-white font-bold py-5 rounded-2xl hover:bg-[#2a2a2a] transition-colors text-lg border border-gray-700"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Sign In
          </button>
        </motion.div>

        {/* Partner Register Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          onClick={handlePartnerRegister}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/40 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          <Building2 className="w-4 h-4" />
          <span className="text-sm font-medium">Register as a Business Partner</span>
        </motion.button>

      </div>
    </div>
  );
}
