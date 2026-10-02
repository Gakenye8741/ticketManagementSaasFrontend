import OrganizerLayout from "../DashBoards/dashboardDesign/OrganaizerLayout"
import { Navbar } from "../components/Navbar"


export const OrganaizerDashBoard = () => {
  return (
    <div className="h-screen mt-20">
      <Navbar/>
      <OrganizerLayout/>        
    </div>
  )
}
