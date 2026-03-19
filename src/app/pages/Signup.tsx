import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import bgImage from "../../assets/background.png";
import { supabase } from "../../lib/supabase";

export function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "client", // client or provider
    referralCode: "",
  });

  useEffect(() => {
    const claimBonus = localStorage.getItem("claimBonus");
    if (claimBonus === "true") {
      setShowBonus(true);
      localStorage.removeItem("claimBonus");
    }
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, phone, password, confirmPassword, role, referralCode } = formData;

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
            role,
            referral_code: referralCode || null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user) {
        // Show success message — user needs to verify email
        setSuccess(
          `Account created! 🎉 We've sent a verification email to ${email}. Please check your inbox to verify your account and claim your 50 LEUS bonus!`
        );

        // Clear form
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          role: "client",
          referralCode: "",
        });
      }

    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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

      {/* Bonus Badge */}
      {showBonus && (
        <div className="mb-4 bg-white/90 backdrop-blur-sm border-2 border-[#10B981] rounded-full px-4 py-2 flex items-center gap-2 relative z-10">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <span className="text-[#1E3A8A] font-semibold">Get 50 LEUS Free!</span>
        </div>
      )}

      {/* Signup Form */}
      <div className="w-full bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-xl relative z-10 border border-white/50">
        <h2 className="text-3xl font-bold text-[#1E3A8A] mb-2 text-center" style={{ fontFamily: 'Syne, sans-serif' }}>
          Create Account
        </h2>
        <p className="text-gray-600 text-center mb-2">Join LeaseUs today</p>

        {/* 50 LEUS bonus reminder */}
        <div className="mb-4 p-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl text-center">
          <span className="text-sm text-[#10B981] font-semibold">🎁 Get 50 LEUS free when you sign up!</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
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

            {/* Email */}
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

            {/* Phone */}
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

            {/* Role Selection */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "client" })}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    formData.role === "client"
                      ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Hire Services
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "provider" })}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    formData.role === "provider"
                      ? "border-[#10B981] bg-[#10B981] text-white"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Offer Services
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a password (min 8 chars)"
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

            {/* Confirm Password */}
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
              </div>
            </div>

            {/* Referral Code (optional) */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Referral Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                placeholder="Enter referral code"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" className="mt-1" required />
              <label htmlFor="terms" className="text-xs text-gray-600">
                I agree to the{" "}
                <span className="text-[#10B981] cursor-pointer hover:underline">Terms of Service</span>
                {" "}and{" "}
                <span className="text-[#10B981] cursor-pointer hover:underline">Privacy Policy</span>
              </label>
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account & Claim 50 LEUS 🎁"
              )}
            </button>
          </form>
        )}

        {/* Back to Login */}
        {success && (
          <Link
            to="/login"
            className="mt-4 w-full bg-[#10B981] text-white py-3 rounded-xl hover:bg-[#0d9e6e] transition-colors flex items-center justify-center"
          >
            Go to Sign In
          </Link>
        )}

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


