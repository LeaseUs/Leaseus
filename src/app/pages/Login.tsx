import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { fetchAuthBootstrap, resolvePostAuthDestination } from "../../lib/authBootstrap";
import { supabase } from "../../lib/supabase";

// ── Median.co bridge type ─────────────────────────────────────────
declare global {
  interface Window {
    gonative?: {
      auth?: {
        bioAuth?: (options: {
          prompt: string;
          successCallback: string;
          failureCallback: string;
        }) => void;
        status?: (callback: (result: { hasTouchId: boolean; hasSecureEnclave: boolean }) => void) => void;
      };
    };
    bioAuthSuccess?: () => void;
    bioAuthFailure?: (reason: string) => void;
  }
}

// ── Storage keys ──────────────────────────────────────────────────
const BIO_REGISTERED_KEY  = "leaseus_bio_registered";
const BIO_CREDENTIAL_KEY  = "leaseus_bio_credential_id";
const BIO_EMAIL_KEY       = "leaseus_bio_email";
// ── Helpers ───────────────────────────────────────────────────────
const isMedianApp = () =>
  typeof window !== "undefined" && !!window.gonative?.auth?.bioAuth;

const supportsWebAuthn = () =>
  typeof window !== "undefined" &&
  !!window.PublicKeyCredential &&
  typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function";

const hasBioRegistered = () =>
  !!localStorage.getItem(BIO_REGISTERED_KEY);

// Convert base64url to Uint8Array
function base64URLToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64URL(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword]   = useState(false);
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [loading, setLoading]             = useState(false);
  const [bioLoading, setBioLoading]       = useState(false);
  const [error, setError]                 = useState("");
  const [showBioButton, setShowBioButton] = useState(false);
  const [bioSupported, setBioSupported]   = useState(false);

  // ── Check biometric support on mount ─────────────────────────
  useEffect(() => {
    checkBiometricSupport();
    // Pre-fill email if previously registered
    const savedEmail = localStorage.getItem(BIO_EMAIL_KEY);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  useEffect(() => {
    let mounted = true;

    const redirectAuthenticatedUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;

      localStorage.setItem("isLoggedIn", "true");
      const bootstrap = await fetchAuthBootstrap(session.user.id);
      if (!mounted) return;

      navigate(resolvePostAuthDestination(bootstrap), {
        replace: true,
        state: { authBootstrap: bootstrap },
      });
    };

    void redirectAuthenticatedUser();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const checkBiometricSupport = async () => {
    // Check Median native app first
    if (isMedianApp()) {
      window.gonative!.auth!.status?.((result) => {
        const supported = result.hasTouchId || result.hasSecureEnclave;
        setBioSupported(supported);
        if (supported && hasBioRegistered()) setShowBioButton(true);
      });
      return;
    }

    // Check WebAuthn
    if (supportsWebAuthn()) {
      try {
        const available = await window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable();
        setBioSupported(available);
        if (available && hasBioRegistered()) setShowBioButton(true);
      } catch {
        setBioSupported(false);
      }
    }
  };

  // ── Register biometric after password login ───────────────────
  const registerBiometric = async (userEmail: string) => {
    if (!bioSupported || hasBioRegistered()) return;

    const offer = window.confirm(
      "Would you like to enable biometric login (fingerprint/Face ID) for faster sign-in next time?"
    );
    if (!offer) return;

    try {
      if (isMedianApp()) {
        // Median — just mark as registered, native biometric handles auth
        localStorage.setItem(BIO_REGISTERED_KEY, "true");
        localStorage.setItem(BIO_EMAIL_KEY, userEmail);
        setShowBioButton(true);
        return;
      }

      // WebAuthn registration
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId    = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "LeaseUs", id: window.location.hostname },
          user: {
            id: userId,
            name: userEmail,
            displayName: userEmail,
          },
          pubKeyCredParams: [
            { alg: -7,  type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "none",
        },
      }) as PublicKeyCredential;

      if (credential) {
        const credId = uint8ArrayToBase64URL(new Uint8Array(credential.rawId));
        localStorage.setItem(BIO_REGISTERED_KEY, "true");
        localStorage.setItem(BIO_CREDENTIAL_KEY, credId);
        localStorage.setItem(BIO_EMAIL_KEY, userEmail);
        setShowBioButton(true);
      }
    } catch (err) {
      console.warn("Biometric registration skipped:", err);
    }
  };

  // ── Biometric login ───────────────────────────────────────────
  const handleBiometricLogin = async () => {
    setBioLoading(true);
    setError("");

    try {
      // ── Median native biometric ──
      if (isMedianApp()) {
        await new Promise<void>((resolve, reject) => {
          window.bioAuthSuccess = () => {
            delete window.bioAuthSuccess;
            delete window.bioAuthFailure;
            resolve();
          };
          window.bioAuthFailure = (reason: string) => {
            delete window.bioAuthSuccess;
            delete window.bioAuthFailure;
            reject(new Error(reason || "Biometric authentication failed"));
          };

          window.gonative!.auth!.bioAuth!({
            prompt: "Sign in to LeaseUs",
            successCallback: "bioAuthSuccess",
            failureCallback: "bioAuthFailure",
          });
        });

        // Biometric passed — restore cached session or prompt password
        await restoreSessionAfterBio();
        return;
      }

      // ── WebAuthn ──
      const credentialId = localStorage.getItem(BIO_CREDENTIAL_KEY);
      if (!credentialId) {
        setError("Biometric not set up. Please sign in with your password first.");
        setBioLoading(false);
        return;
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: base64URLToUint8Array(credentialId) as BufferSource,
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (assertion) {
        await restoreSessionAfterBio();
      }
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setError("Biometric authentication was cancelled or failed.");
      } else {
        setError(err?.message || "Biometric authentication failed. Please use your password.");
      }
    } finally {
      setBioLoading(false);
    }
  };

  // ── Restore Supabase session after biometric passes ───────────
  const restoreSessionAfterBio = async () => {
    // Try to refresh the existing Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (session && !sessionError) {
      const bootstrap = await fetchAuthBootstrap(session.user.id);
      navigate(resolvePostAuthDestination(bootstrap), {
        replace: true,
        state: { authBootstrap: bootstrap },
      });
      return;
    }

    setError("Your session has expired. Please sign in with your password to continue.");
    setBioLoading(false);
  };

  // ── Password login ────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Incorrect email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please verify your email before signing in.");
        } else {
          setError(error.message);
        }
        return;
      }

      // mark logged in
      localStorage.setItem("isLoggedIn", "true");

      const userId = data.user?.id || data.session?.user?.id;
      const bootstrap = userId ? await fetchAuthBootstrap(userId) : null;

      // Offer biometric registration if supported and not yet registered
      if (bioSupported && !hasBioRegistered()) {
        await registerBiometric(email);
      }

      const destination = resolvePostAuthDestination(bootstrap);
      navigate(destination, { replace: true, state: bootstrap ? { authBootstrap: bootstrap } : undefined });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ───────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email) { setError("Please enter your email address first."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      alert(`Password reset link sent to ${email}. Check your inbox!`);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="leaseus-auth-screen min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      {/* Backdrop */}
      <div className="leaseus-auth-overlay absolute inset-0"></div>

      {/* Form card */}
      <div className="leaseus-auth-card w-full rounded-2xl p-6 relative z-10">
        <h2
          className="text-3xl font-bold text-[#1E3A8A] mb-2 text-center"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Welcome Back
        </h2>
        <p className="text-gray-600 text-center mb-6">Sign in to continue</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Email</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
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

          {/* Forgot password */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-[#10B981] hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in...</>
              : "Sign In"
            }
          </button>

          {/* Biometric button — only shown if device supports it AND user has registered */}
          {showBioButton && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={bioLoading}
              className="w-full border-2 border-[#10B981] text-[#10B981] py-3 rounded-xl hover:bg-[#10B981] hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {bioLoading
                ? <><Loader2 className="w-5 h-5 animate-spin" />Authenticating...</>
                : <><Fingerprint className="w-5 h-5" />Sign in with Biometric</>
              }
            </button>
          )}
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-[#10B981] hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}


