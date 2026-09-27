// TokenExpiryWatcher.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TokenExpiryWatcher = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTokenExpiration = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;

        const parsedUser = JSON.parse(storedUser);

        // Extract the exp (expiration timestamp in seconds)
        const exp = parsedUser?.exp;
        if (!exp) return;

        const currentTime = Math.floor(Date.now() / 1000); // in seconds

        if (currentTime >= exp) {
          alert("Your session has expired. Please log in again.");
          localStorage.clear(); // or selectively clear auth data
          navigate("/login");
        }
      } catch (error) {
        console.error("Error checking token expiration:", error);
      }
    };

    // Check immediately on mount
    checkTokenExpiration();

    // Then every minute
    const interval = setInterval(checkTokenExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  return null;
};

export default TokenExpiryWatcher;
