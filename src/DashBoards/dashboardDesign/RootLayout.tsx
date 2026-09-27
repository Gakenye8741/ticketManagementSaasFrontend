
import { Outlet } from "react-router-dom";
import TokenExpiryWatcher from "../../components/TokenWatcher";

const RootLayout = () => {
  return (
    <>
      <TokenExpiryWatcher/>
      <Outlet />
    </>
  );
};

export default RootLayout;
