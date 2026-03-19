import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export function InitialRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const runRedirect = async () => {
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
      const isLoggedIn = localStorage.getItem("isLoggedIn");

      if (isLoggedIn) {
        navigate("/home");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        localStorage.setItem("isLoggedIn", "true");
        navigate("/home");
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


