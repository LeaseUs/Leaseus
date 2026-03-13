import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import bgImage from "figma:asset/26efaf54209cf3936abcb1e97f9969d980464042.png";

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - in production, validate credentials with backend
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("hasSeenWelcome", "true");
    navigate("/home");
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto relative overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Backdrop Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/20"></div>

      {/* Login Form */}
      <div className="w-full bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-xl relative z-10 border border-white/50">
        <h2 className="text-3xl font-bold text-[#1E3A8A] mb-2 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>Welcome Back</h2>
        <p className="text-gray-600 text-center mb-6">
          Sign in to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Email or Phone
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or phone"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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

          {/* Forgot Password */}
          <div className="text-right">
            <button type="button" className="text-sm text-[#10B981] hover:underline">
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors"
          >
            Sign In
          </button>

          {/* Biometric Login */}
          <button
            type="button"
            className="w-full border-2 border-[#10B981] text-[#10B981] py-3 rounded-xl hover:bg-[#10B981] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-5 h-5" />
            Sign in with Biometric
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-[#10B981] hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}