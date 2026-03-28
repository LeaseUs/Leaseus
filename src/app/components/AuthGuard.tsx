import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { fetchAuthBootstrap, getStoredAuthBootstrap, storeAuthBootstrap } from "../../lib/authBootstrap";
import { supabase } from "../../lib/supabase";

export function AuthGuard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [kyc, setKyc] = useState<any>(null);   // ← must be declared
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const stateBootstrap = (location.state as { authBootstrap?: any } | null)?.authBootstrap;
    const cachedBootstrap = stateBootstrap || getStoredAuthBootstrap();

    if (cachedBootstrap?.user?.id) {
      setUser(cachedBootstrap.user);
      setProfile(cachedBootstrap.profile || null);
      setKyc(cachedBootstrap.kyc || null);
      setLoading(false);
    }

    const applyBootstrap = async (userId: string) => {
      try {
        const bootstrap = await fetchAuthBootstrap(userId);
        if (!mounted) return;
        setUser(bootstrap.user);
        setProfile(bootstrap.profile || null);
        setKyc(bootstrap.kyc || null);
      } catch (error) {
        console.error("Auth bootstrap error", error);
        if (!mounted) return;
        setProfile(null);
        setKyc(null);
      }
    };

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        await applyBootstrap(currentUser.id);
      } else {
        localStorage.removeItem("isLoggedIn");
        storeAuthBootstrap(null);
        setProfile(null);
        setKyc(null);
      }
      if (mounted) setLoading(false);
    };
    check();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      if (!mounted) return;
      setUser(newUser);
      if (newUser) {
        await applyBootstrap(newUser.id);
      } else {
        localStorage.removeItem("isLoggedIn");
        storeAuthBootstrap(null);
        setProfile(null);
        setKyc(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A8A]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/signup" replace />;

  const { status, role } = profile;

  // Admin routes should stay inside the admin shell.
  if (role === "admin") {
    if (location.pathname.startsWith("/admin")) return <Outlet />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Provider flow
  if (role === "provider" || role === "local_business") {
    const hasKyc = !!kyc;
    const kycSubmitted = kyc && (kyc.status === "submitted" || kyc.status === "under_review");
    const assessmentPending = !!kyc && (kyc.current_step ?? 0) >= 3 && kyc.assessment_status !== "completed";
    const isKycRoute = location.pathname.startsWith("/home/kyc");
    const isOnboardingRoute = location.pathname === "/provider-onboarding";
    const assessmentPath = kyc?.id
      ? `/home/kyc/assessment?kycId=${kyc.id}${kyc.category ? `&category=${encodeURIComponent(kyc.category)}` : ""}`
      : "/home/kyc/assessment";
    const isAssessmentRoute = location.pathname === "/home/kyc/assessment";

    if (status === "pending" && !hasKyc) {
      return !isOnboardingRoute ? <Navigate to="/provider-onboarding" replace /> : <Outlet />;
    }
    if (status === "pending" && assessmentPending) {
      return !isAssessmentRoute ? <Navigate to={assessmentPath} replace /> : <Outlet />;
    }
    if (status === "pending" && !kycSubmitted) {
      if (isAssessmentRoute) return <Navigate to="/home/kyc" replace />;
      return !isKycRoute ? <Navigate to="/home/kyc" replace /> : <Outlet />;
    }
    if (status === "pending" && kycSubmitted) {
      if (!isKycRoute && !isOnboardingRoute) return <Navigate to="/kyc-pending" replace />;
      if (isKycRoute) return <Navigate to="/kyc-pending" replace />;
      return <Outlet />;
    }
    if (status === "rejected") return <Navigate to="/kyc-rejected" replace />;
  }

  // Clients or active users
  if (status === 'active') return <Outlet />;

  // Fallback
  return <Navigate to="/login" replace />;
}
