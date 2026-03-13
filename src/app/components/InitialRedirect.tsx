import { useEffect } from "react";
import { useNavigate } from "react-router";
import bgImage from "../../assets/background.png";

export function InitialRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn) {
      navigate("/home");
    } else if (hasSeenWelcome) {
      navigate("/login");
    } else {
      navigate("/splash");
    }
  }, [navigate]);

  return null;
}
