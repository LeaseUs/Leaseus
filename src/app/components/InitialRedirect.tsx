import { useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAuthBootstrap, getStoredAuthBootstrap, resolvePostAuthDestination, storeAuthBootstrap } from "../../lib/authBootstrap";
import { supabase } from "../../lib/supabase";

export function InitialRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const runRedirect = async () => {
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
      const cachedBootstrap = getStoredAuthBootstrap();
      const cachedDestination = resolvePostAuthDestination(cachedBootstrap);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        localStorage.setItem("isLoggedIn", "true");
        if (cachedBootstrap?.user?.id === session.user.id) {
          navigate(cachedDestination, { replace: true });
          return;
        }
        const bootstrap = await fetchAuthBootstrap(session.user.id);
        navigate(resolvePostAuthDestination(bootstrap), { replace: true });
        return;
      }

      localStorage.removeItem("isLoggedIn");
      storeAuthBootstrap(null);

      if (hasSeenWelcome) {
        navigate("/login", { replace: true });
      } else {
        navigate("/splash", { replace: true });
      }
    };

    runRedirect();
  }, [navigate]);

  return null;
}


