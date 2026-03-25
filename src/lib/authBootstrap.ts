import { supabase } from "./supabase";

const AUTH_BOOTSTRAP_KEY = "leaseus_auth_bootstrap";
const AUTH_BOOTSTRAP_MAX_AGE_MS = 5 * 60 * 1000;

export interface AuthBootstrap {
  user: { id: string };
  profile: { status: string; role: string } | null;
  kyc: {
    id: string;
    status: string;
    current_step: number | null;
    assessment_status: string | null;
    category: string | null;
  } | null;
  createdAt: number;
}

export function resolvePostAuthDestination(bootstrap: Pick<AuthBootstrap, "profile" | "kyc"> | null): string {
  const role = bootstrap?.profile?.role;
  const status = bootstrap?.profile?.status;
  const kycStatus = bootstrap?.kyc?.status;
  const assessmentStatus = bootstrap?.kyc?.assessment_status;
  const currentStep = bootstrap?.kyc?.current_step ?? 0;
  const isProvider = role === "provider" || role === "local_business";

  if (role === "admin") return "/admin/dashboard";
  if (!role) return "/signup";
  if (!isProvider) return "/home";

  if (status === "active") return "/home";
  if (status === "rejected") return "/kyc-rejected";
  if (!bootstrap?.kyc) return "/provider-onboarding";
  if (kycStatus === "submitted" || kycStatus === "under_review") return "/kyc-pending";
  if (currentStep >= 3 && assessmentStatus !== "completed") {
    const params = new URLSearchParams();
    params.set("kycId", bootstrap.kyc.id);
    if (bootstrap.kyc.category) params.set("category", bootstrap.kyc.category);
    return `/home/kyc/assessment?${params.toString()}`;
  }
  return "/home/kyc";
}

export function getStoredAuthBootstrap(): AuthBootstrap | null {
  try {
    const raw = sessionStorage.getItem(AUTH_BOOTSTRAP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthBootstrap;
    if (!parsed?.user?.id) return null;
    if (Date.now() - parsed.createdAt > AUTH_BOOTSTRAP_MAX_AGE_MS) {
      sessionStorage.removeItem(AUTH_BOOTSTRAP_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(AUTH_BOOTSTRAP_KEY);
    return null;
  }
}

export function storeAuthBootstrap(bootstrap: AuthBootstrap | null) {
  if (!bootstrap) {
    sessionStorage.removeItem(AUTH_BOOTSTRAP_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_BOOTSTRAP_KEY, JSON.stringify(bootstrap));
}

export async function fetchAuthBootstrap(userId: string): Promise<AuthBootstrap> {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  let kycData: AuthBootstrap["kyc"] = null;
  if (profileData?.role === "provider" || profileData?.role === "local_business") {
    const { data, error } = await supabase
      .from("provider_kyc")
      .select("id, status, current_step, assessment_status, category")
      .eq("provider_id", userId)
      .maybeSingle();
    if (error) throw error;
    kycData = data || null;
  }

  const bootstrap = {
    user: { id: userId },
    profile: profileData || null,
    kyc: kycData,
    createdAt: Date.now(),
  };
  storeAuthBootstrap(bootstrap);
  return bootstrap;
}
