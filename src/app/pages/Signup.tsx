import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import bgImage from "figma:asset/26efaf54209cf3936abcb1e97f9969d980464042.png";

export function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check if user came from the bonus button
    const claimBonus = localStorage.getItem("claimBonus");
    if (claimBonus === "true") {
      setShowBonus(true);
      localStorage.removeItem("claimBonus"); // Clear it after checking
    }
  }, []);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const { password, confirmPassword } = formData;
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    // Mock signup - in production, create account with backend
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("hasSeenWelcome", "true");
    navigate("/home");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-8 max-w-md mx-auto relative overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Backdrop Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/20"></div>

      {/* Bonus Badge - Only show if coming from bonus button */}
      {showBonus && (
        <div className="mb-4 bg-white/90 backdrop-blur-sm border-2 border-[#10B981] rounded-full px-4 py-2 flex items-center gap-2 relative z-10">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <span className="text-[#1E3A8A] font-semibold">Get 50 LEUS Free!</span>
        </div>
      )}

      {/* Signup Form */}
      <div className="w-full bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-xl relative z-10 border border-white/50">
        <h2 className="text-3xl font-bold text-[#1E3A8A] mb-2 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>Create Account</h2>
        <p className="text-gray-600 text-center mb-6">
          Join LeaseUs today
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter your phone number"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a password"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2">
            <input type="checkbox" id="terms" className="mt-1" required />
            <label htmlFor="terms" className="text-xs text-gray-600">
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors"
          >
            Create Account
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-[#10B981] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}