import { useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAuthBootstrap, getStoredAuthBootstrap, resolvePostAuthDestination } from "../../lib/authBootstrap";
import { supabase } from "../../lib/supabase";

export function InitialRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const runRedirect = async () => {
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      const cachedBootstrap = getStoredAuthBootstrap();
      const cachedDestination = resolvePostAuthDestination(cachedBootstrap);

      if (isLoggedIn) {
        if (cachedBootstrap) {
          navigate(cachedDestination);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        localStorage.setItem("isLoggedIn", "true");
        if (cachedBootstrap?.user?.id === session.user.id) {
          navigate(cachedDestination);
          return;
        }
        const bootstrap = await fetchAuthBootstrap(session.user.id);
        navigate(resolvePostAuthDestination(bootstrap));
        return;
      }

      if (hasSeenWelcome) {
        navigate("/login");
      } else {
        navigate("/splash");
      }
    };

    runRedirect();
  }, [navigate]);

  return null;
}


