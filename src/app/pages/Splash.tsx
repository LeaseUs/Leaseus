import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Building2 } from "lucide-react";
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
      {/* Spacer */}
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

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
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
          transition={{ delay: 0.6, duration: 0.6 }}
          onClick={handlePartnerRegister}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(30,58,138,0.55) 0%, rgba(16,185,129,0.45) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            boxShadow: '0 4px 20px rgba(30,58,138,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <Building2 className="w-4 h-4 text-white" />
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: 'Syne, sans-serif',
              background: 'linear-gradient(90deg, #ffffff 0%, #a7f3d0 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Register as a Business Partner
          </span>
        </motion.button>

      </div>
    </div>
  );
}

