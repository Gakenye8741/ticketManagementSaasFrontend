import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css';
import { Home } from './pages/Home';

import Login from './pages/Login';
import Register from './pages/Register';
import { AdminDashBoard } from './pages/AdminDashBoard';
import { DAshboard } from './pages/DAshboard';
import ProtectedRoutes from './components/ProtectedRoutes';
import Error from './pages/Error';
import UserProfile from './DashBoards/dashboard/UserProfile';
import { Analytics } from './DashBoards/adminDashboard/Analytics';
import { AllUsers } from './DashBoards/adminDashboard/AllUsers';
import { AllVenues } from './DashBoards/adminDashboard/AllVenues';
import { EventDetailsPage } from './DashBoards/adminDashboard/AllEvents';
// import BookingsByNationalId from './DashBoards/dashboard/BookingsById';
import { TicketTypes } from './DashBoards/adminDashboard/getAllTicketTypes';
import { AllBookings } from './DashBoards/adminDashboard/AllBookings';
// import { EventDetailPage } from './content-folders/Events/eventPage';
import AllMedia from './DashBoards/adminDashboard/AllMedias';
import UserSupportTickets from './DashBoards/dashboard/SupportTickets';
import AdminSupportTickets from './DashBoards/adminDashboard/AllTicketSupport';
import ContactForm from './pages/Contact';
import GetPaymentsByNationalId from './DashBoards/dashboard/GetPaymentsByNationalId';
import AllPayments from './DashBoards/adminDashboard/GetAllPayments';
import RootLayout from './DashBoards/dashboardDesign/RootLayout';
import TicketDisplay from './DashBoards/dashboard/UserTickets';
import EmailVerification from './pages/EmailVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/PasswordReset';
import SalesReport from './DashBoards/adminDashboard/SalesReport';
import AdminUserProfile from './DashBoards/adminDashboard/AdminUserProfile';
import { Toaster } from 'react-hot-toast';
import BackButtonHandler from './pages/BackButtonHandler';
import QrCodes from './DashBoards/dashboard/QRcodes';
import { UserAnalyticsPage } from './DashBoards/dashboard/UserAnalyticsPage';
import { EventsPage } from './pages/Events';
import { EventSlugPage } from './pages/Slug';
import TicketViewPage from './pages/TicketViewPage'; // 👈 Imported the new Ticket View page
import { AboutPage } from './pages/About';
import PricingSection from './pages/pricing';
import { OrganaizerDashBoard } from './pages/OrganaizerDashboard';
import {OrganizationManager} from './DashBoards/OrganizerDashboard/OrganizationManager';
import EventManager from './DashBoards/OrganizerDashboard/EventManager';
import TicketTypesManager from './DashBoards/OrganizerDashboard/TicketTypesManager';
import { EventMediaManager } from './DashBoards/OrganizerDashboard/MediaMAnager';
import BookingsManager from './DashBoards/OrganizerDashboard/BookingsManager';
import PaymentsManager from './DashBoards/OrganizerDashboard/PaymentManager';

function App() {
  const Router = createBrowserRouter([
    {
      path: '/',
      element: (
        <>
          <BackButtonHandler />
          <RootLayout />
        </>
      ),
      children: [
        { path: '/', element: <Home /> },
        { path: '/about', element: <AboutPage /> },
        { path: '/events', element: <EventsPage /> },
        { path: '/events/:slug', element: <EventSlugPage /> },
        { path: '/login', element: <Login /> },
        { path: '/pricing', element: <PricingSection /> },
        { path: '/register', element: <Register /> },
        { path: '/contact', element: <ContactForm /> },
        { path: "/email-verification", element: <EmailVerification />, errorElement: <Error /> },
        { path: "/forgot-password", element: <ForgotPassword />, errorElement: <Error /> },
        { path: "/reset-password/:token", element: <ResetPassword />, errorElement: <Error /> },
        { path: '/tickets/view/:ticketToken', element: <TicketViewPage /> }, 
      ],
    },

    {
      path: 'dashboard',
      element: (
        <ProtectedRoutes>
          <DAshboard />
        </ProtectedRoutes>
      ),
      errorElement: <Error />,
      children: [
        { path: 'me', element: <UserProfile /> },
        { path: 'supportTickets', element: <UserSupportTickets /> },
        { path: 'Payments', element: <GetPaymentsByNationalId /> },
        { path: 'MyTickets', element: <TicketDisplay /> },
        { path: 'qr-codes', element: <QrCodes /> },
        { path: 'analytics', element: <UserAnalyticsPage /> },
      ],
    },
    {
      path: 'admindashboard',
      element: (
        <ProtectedRoutes>
          <AdminDashBoard />
        </ProtectedRoutes>
      ),
      errorElement: <Error />,
      children: [
        { path: 'analytics', element: <Analytics /> },
        { path: 'AllMedia', element: <AllMedia /> },
        { path: 'AllBookings', element: <AllBookings /> },
        { path: 'supportTickets', element: <AdminSupportTickets /> },
        { path: 'allusers', element: <AllUsers /> },
        { path: 'AllVenues', element: <AllVenues /> },
        { path: 'AllEvents', element: <EventDetailsPage /> },
        { path: 'ticketTypes', element: <TicketTypes /> },
        { path: 'AllPayments', element: <AllPayments /> },
        { path: 'adminprofile', element: <AdminUserProfile /> },
        { path: 'SalesReports', element: <SalesReport /> },
      ],
    },
    {
      path: 'organizer-dashboard',
      element: (
        <ProtectedRoutes>
          <OrganaizerDashBoard />
        </ProtectedRoutes>
      ),
      errorElement: <Error />,
      children: [
        { path: 'my-organization', element: <OrganizationManager /> },
        { path: 'my-events', element: <EventManager /> },
        { path: 'ticket-types', element: <TicketTypesManager /> },
        { path: 'media', element: <EventMediaManager /> },
        { path: 'bookings', element: <BookingsManager /> },
        { path: 'payments', element: <PaymentsManager /> },
        
     
      ],
    },
  ]);

  return (
    <>
      <Toaster position='top-right' reverseOrder={false} />
      <RouterProvider router={Router} />
    </>
  );
}

export default App;