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

async function ensureProfile(userId: string, profile: AuthBootstrap["profile"]): Promise<AuthBootstrap["profile"]> {
  if (profile) return profile;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || user.id !== userId) return null;

  const metadata = user.user_metadata ?? {};
  const requestedRole = metadata.role === "provider" || metadata.role === "local_business" || metadata.role === "admin"
    ? metadata.role
    : "client";
  const status = requestedRole === "provider" || requestedRole === "local_business" ? "pending" : "active";

  const { data: profileData, error: upsertError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? null,
      email: user.email ?? null,
      phone: metadata.phone ?? user.phone ?? null,
      role: requestedRole,
      status,
    }, { onConflict: "id" })
    .select("status, role")
    .single();

  if (upsertError) throw upsertError;
  return profileData || null;
}

export async function fetchAuthBootstrap(userId: string): Promise<AuthBootstrap> {
  const { data: rawProfileData, error: profileError } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const profileData = await ensureProfile(userId, rawProfileData || null);

  let kycData: AuthBootstrap["kyc"] = null;
  if (profileData?.role === "provider" || profileData?.role === "local_business") {
    const { data, error } = await supabase
      .from("provider_kyc")
      .select("id, status, current_step, assessment_status, category")
      .eq("provider_id", userId)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    kycData = data?.[0] || null;
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
