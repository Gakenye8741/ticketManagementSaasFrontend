import { useSelector } from "react-redux"
import type { RootState } from "../App/store"
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";


type ProtectedRouteProps ={
  children: ReactNode
}
const ProtectedRoutes = ({children}:ProtectedRouteProps) => {
  const {isAuthenticated} = useSelector((state:RootState)=>state.auth);
    if(!isAuthenticated){
      return <Navigate to='/login' replace/>
    }

    return <>{children}</>
 
}

export default ProtectedRoutes