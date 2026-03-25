import { createBrowserRouter } from "react-router";

const lazyRoute = <T extends Record<string, unknown>>(loader: () => Promise<T>, key: keyof T) => ({
  lazy: async () => {
    const mod = await loader();
    return { Component: mod[key] as never };
  },
});

export const router = createBrowserRouter([
  {
    index: true,
    ...lazyRoute(() => import("./components/InitialRedirect"), "InitialRedirect"),
  },
  {
    path: "/splash",
    ...lazyRoute(() => import("./pages/Splash"), "Splash"),
  },
  {
    path: "/welcome",
    ...lazyRoute(() => import("./pages/Welcome"), "Welcome"),
  },
  {
    path: "/login",
    ...lazyRoute(() => import("./pages/Login"), "Login"),
  },
  {
    path: "/signup",
    ...lazyRoute(() => import("./pages/Signup"), "Signup"),
  },
  {
    path: "/reset-password",
    ...lazyRoute(() => import("./pages/ResetPassword"), "ResetPassword"),
  },
  {
    path: "/provider-onboarding",
    ...lazyRoute(() => import("./pages/ProviderOnboarding"), "ProviderOnboarding"),
  },
  {
    path: "/partner/register",
    ...lazyRoute(() => import("./pages/PartnerRegister"), "PartnerRegister"),
  },
  {
    path: "/admin/partners",
    ...lazyRoute(() => import("./pages/AdminPartners"), "AdminPartners"),
  },
  {
    path: "/admin/kyc",
    ...lazyRoute(() => import("./pages/AdminKYC"), "AdminKYC"),
  },
  {
    path: "/admin/dashboard",
    ...lazyRoute(() => import("./pages/AdminDashboard"), "AdminDashboard"),
  },
  {
    path: "/admin/profile",
    ...lazyRoute(() => import("./pages/AdminProfile"), "AdminProfile"),
  },
  {
    path: "/kyc-pending",
    ...lazyRoute(() => import("./pages/KYCPending"), "KYCPending"),
  },
  {
    path: "/kyc-rejected",
    ...lazyRoute(() => import("./pages/KYCRejected"), "KYCRejected"),
  },
  {
    path: "/home",
    ...lazyRoute(() => import("./components/AuthGuard"), "AuthGuard"),
    children: [
      {
        ...lazyRoute(() => import("./components/Layout"), "Layout"),
        children: [
          { index: true,              ...lazyRoute(() => import("./pages/Home"), "Home") },
          { path: "wallet",           ...lazyRoute(() => import("./pages/Wallet"), "Wallet") },
          { path: "mintleaf",         ...lazyRoute(() => import("./pages/MintLeaf"), "MintLeaf") },
          { path: "services",         ...lazyRoute(() => import("./pages/Services"), "Services") },
          { path: "service/:id",      ...lazyRoute(() => import("./pages/ServiceDetail"), "ServiceDetail") },
          { path: "provider/:id",     ...lazyRoute(() => import("./pages/ProviderProfile"), "ProviderProfile") },
          { path: "kyc",              ...lazyRoute(() => import("./pages/ProviderKYC"), "ProviderKYC") },
          { path: "kyc/assessment",   ...lazyRoute(() => import("./pages/KYCAssessment"), "KYCAssessment") },
          { path: "providers",        ...lazyRoute(() => import("./pages/Providers"), "Providers") },
          { path: "bookings",         ...lazyRoute(() => import("./pages/Bookings"), "Bookings") },
          { path: "navigation/:id",   ...lazyRoute(() => import("./pages/ProviderNavigation"), "ProviderNavigation") },
          { path: "messages",         ...lazyRoute(() => import("./pages/Messages"), "Messages") },
          { path: "conversation/:id", ...lazyRoute(() => import("./pages/Conversation"), "Conversation") },
          { path: "subscriptions",    ...lazyRoute(() => import("./pages/Subscriptions"), "Subscriptions") },
          { path: "loyalty",          ...lazyRoute(() => import("./pages/Loyalty"), "Loyalty") },
          { path: "profile",          ...lazyRoute(() => import("./pages/Profile"), "Profile") },
          { path: "reviews",          ...lazyRoute(() => import("./pages/Reviews"), "Reviews") },
        ],
      },
    ],
  },
  {
    path: "*",
    ...lazyRoute(() => import("./pages/NotFound"), "NotFound"),
  },
]);
