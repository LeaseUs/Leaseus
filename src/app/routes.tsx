import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Wallet } from "./pages/Wallet";
import { MintLeaf } from "./pages/MintLeaf";
import { Services } from "./pages/Services";
import { ProviderServices } from "./pages/ProviderServices";
import { Messages } from "./pages/Messages";
import { Conversation } from "./pages/Conversation";
import { ServiceDetail } from "./pages/ServiceDetail";
import { Bookings } from "./pages/Bookings";
import { Subscriptions } from "./pages/Subscriptions";
import { Loyalty } from "./pages/Loyalty";
import { Profile } from "./pages/Profile";
import { PartnerRegister } from "./pages/PartnerRegister";
import { AdminPartners } from "./pages/AdminPartners";
import { Splash } from "./pages/Splash";
import { Welcome } from "./pages/Welcome";
import { Layout } from "./components/Layout";
import { InitialRedirect } from "./components/InitialRedirect";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    index: true,
    Component: InitialRedirect,
  },
  {
    path: "/splash",
    Component: Splash,
  },
  {
    path: "/welcome",
    Component: Welcome,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/partner/register",
    Component: PartnerRegister,
  },
  {
    path: "/admin/partners",
    Component: AdminPartners,
  },
  {
    path: "/home",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "wallet", Component: Wallet },
      { path: "mintleaf", Component: MintLeaf },
      { path: "services", Component: Services },
      { path: "services", Component: ProviderServices },
      { path: "service/:id", Component: ServiceDetail },
      { path: "bookings", Component: Bookings },
      { path: "messages", Component: Messages },
      { path: "messages/:id", Component: Conversation },
      { path: "subscriptions", Component: Subscriptions },
      { path: "loyalty", Component: Loyalty },
      { path: "profile", Component: Profile },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
