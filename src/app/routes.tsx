import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Wallet } from "./pages/Wallet";
import { Services } from "./pages/Services";
import { ServiceDetail } from "./pages/ServiceDetail";
import { Subscriptions } from "./pages/Subscriptions";
import { Loyalty } from "./pages/Loyalty";
import { Profile } from "./pages/Profile";
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
    path: "/home",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "wallet", Component: Wallet },
      { path: "services", Component: Services },
      { path: "service/:id", Component: ServiceDetail },
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
