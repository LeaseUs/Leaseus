import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import bgImage from "../../assets/background.png";
import { supabase } from "../../lib/supabase";

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Show friendly error messages
        if (error.message.includes("Invalid login credentials")) {
          setError("Incorrect email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please verify your email before signing in.");
        } else {
          setError(error.message);
        }
        return;
      }

      // Success — navigate to home
      navigate("/home");

    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setError(""); 
      alert(`Password reset link sent to ${email}. Check your inbox!`);
    }
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
        <h2 className="text-3xl font-bold text-[#1E3A8A] mb-2 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>
          Welcome Back
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Sign in to continue
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

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
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-[#10B981] hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
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