import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// ── Eagerly loaded (needed on first paint) ─────────────────────
import { Splash }          from "./pages/Splash";
import { Welcome }         from "./pages/Welcome";
import { Login }           from "./pages/Login";
import { Signup }          from "./pages/Signup";
import { InitialRedirect } from "./components/InitialRedirect";
import { AuthGuard }       from "./components/AuthGuard";
import { Layout }          from "./components/Layout";
import { NotFound }        from "./pages/NotFound";

// ── Lazily loaded (split into separate chunks) ─────────────────
const Home               = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })));
const Wallet             = lazy(() => import("./pages/Wallet").then(m => ({ default: m.Wallet })));
const MintLeaf           = lazy(() => import("./pages/MintLeaf").then(m => ({ default: m.MintLeaf })));
const Services           = lazy(() => import("./pages/Services").then(m => ({ default: m.Services })));
const ServiceDetail      = lazy(() => import("./pages/ServiceDetail").then(m => ({ default: m.ServiceDetail })));
const ProviderProfile    = lazy(() => import("./pages/ProviderProfile").then(m => ({ default: m.ProviderProfile })));
const Providers          = lazy(() => import("./pages/Providers").then(m => ({ default: m.Providers })));
const Bookings           = lazy(() => import("./pages/Bookings").then(m => ({ default: m.Bookings })));
const Messages           = lazy(() => import("./pages/Messages").then(m => ({ default: m.Messages })));
const Conversation       = lazy(() => import("./pages/Conversation").then(m => ({ default: m.Conversation })));
const Subscriptions      = lazy(() => import("./pages/Subscriptions").then(m => ({ default: m.Subscriptions })));
const Loyalty            = lazy(() => import("./pages/Loyalty").then(m => ({ default: m.Loyalty })));
const Profile            = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Reviews            = lazy(() => import("./pages/Reviews").then(m => ({ default: m.Reviews })));
const PartnerRegister    = lazy(() => import("./pages/PartnerRegister").then(m => ({ default: m.PartnerRegister })));
const AdminPartners      = lazy(() => import("./pages/AdminPartners").then(m => ({ default: m.AdminPartners })));
const AdminKYC           = lazy(() => import("./pages/AdminKYC").then(m => ({ default: m.AdminKYC })));
const ProviderKYC        = lazy(() => import("./pages/ProviderKYC").then(m => ({ default: m.ProviderKYC })));
const KYCAssessment      = lazy(() => import("./pages/KYCAssessment").then(m => ({ default: m.KYCAssessment })));
const ProviderNavigation = lazy(() => import("./pages/ProviderNavigation").then(m => ({ default: m.ProviderNavigation })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { index: true,           Component: InitialRedirect },
  { path: "/splash",       Component: Splash },
  { path: "/welcome",      Component: Welcome },
  { path: "/login",        Component: Login },
  { path: "/signup",       Component: Signup },
  { path: "/partner/register", element: <S><PartnerRegister /></S> },
  { path: "/admin/partners",   element: <S><AdminPartners /></S> },
  { path: "/admin/kyc",        element: <S><AdminKYC /></S> },
  {
    path: "/home",
    Component: AuthGuard,
    children: [
      {
        Component: Layout,
        children: [
          { index: true,              element: <S><Home /></S> },
          { path: "wallet",           element: <S><Wallet /></S> },
          { path: "mintleaf",         element: <S><MintLeaf /></S> },
          { path: "services",         element: <S><Services /></S> },
          { path: "service/:id",      element: <S><ServiceDetail /></S> },
          { path: "provider/:id",     element: <S><ProviderProfile /></S> },
          { path: "kyc",              element: <S><ProviderKYC /></S> },
          { path: "kyc/assessment",   element: <S><KYCAssessment /></S> },
          { path: "providers",        element: <S><Providers /></S> },
          { path: "bookings",         element: <S><Bookings /></S> },
          { path: "navigation/:id",   element: <S><ProviderNavigation /></S> },
          { path: "messages",         element: <S><Messages /></S> },
          { path: "conversation/:id", element: <S><Conversation /></S> },
          { path: "subscriptions",    element: <S><Subscriptions /></S> },
          { path: "loyalty",          element: <S><Loyalty /></S> },
          { path: "profile",          element: <S><Profile /></S> },
          { path: "reviews",          element: <S><Reviews /></S> },
        ],
      },
    ],
  },
  { path: "*", Component: NotFound },
]);
