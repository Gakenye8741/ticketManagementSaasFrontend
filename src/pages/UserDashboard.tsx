import UserLayout from "../DashBoards/dashboardDesign/Layout"
import { Navbar } from "../components/Navbar"


export const UserDashBoard = () => {
  return (
    <div className="h-screen mt-20">
      <Navbar/>
      <UserLayout/>        
    </div>
  )
}
