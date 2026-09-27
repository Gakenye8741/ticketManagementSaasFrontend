import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Create the listener
    const setupListener = async () => {
      await App.addListener('backButton', ({ canGoBack }) => {
        // Define root paths where the app should minimize instead of going back
        const rootPaths = ['/', '/dashboard', '/admindashboard'];
        const isRoot = rootPaths.includes(location.pathname);

        if (isRoot) {
          // Send app to background if on a main screen
          App.minimizeApp();
        } else if (canGoBack) {
          // Go back in React Router history
          navigate(-1);
        } else {
          // Fallback if no history is left
          App.minimizeApp();
        }
      });
    };

    setupListener();

    // 2. Clean up listener on unmount
    return () => {
      App.removeAllListeners();
    };
  }, [location, navigate]);

  return null;
};

export default BackButtonHandler;