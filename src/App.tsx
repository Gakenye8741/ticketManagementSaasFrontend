import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css';
import { Home } from './pages/Home';

import Login from './pages/Login';
import Register from './pages/Register';
import { AdminDashBoard } from './pages/AdminDashBoard';
import ProtectedRoutes from './components/ProtectedRoutes';
import Error from './pages/Error';
// import UserProfile from './DashBoards/dashboard/UserProfile';

import AdminManageUsers from './DashBoards/adminDashboard/AllUsers';
import { TicketTypes } from './DashBoards/adminDashboard/getAllTicketTypes';

// import { EventDetailPage } from './content-folders/Events/eventPage';
import UserSupportTickets from './DashBoards/dashboard/SupportTickets';
import AdminSupportTickets from './DashBoards/adminDashboard/AllTicketSupport';
import ContactForm from './pages/Contact';
import AllPayments from './DashBoards/adminDashboard/GetAllPayments';
import RootLayout from './DashBoards/dashboardDesign/RootLayout';
import EmailVerification from './pages/EmailVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/PasswordReset';
import SalesReport from './DashBoards/adminDashboard/SalesReport';
// import AdminUserProfile from './DashBoards/adminDashboard/AdminUserProfile';
import { Toaster } from 'react-hot-toast';
import BackButtonHandler from './pages/BackButtonHandler';
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
import TicketsManager from './DashBoards/OrganizerDashboard/TicketsManager';
import AnalyticsManager from './DashBoards/OrganizerDashboard/AnalyticsManager';
import WalletManager from './DashBoards/OrganizerDashboard/WalletManager';
import OrganizerProfileManager from './DashBoards/OrganizerDashboard/OrganizerProfileManager';
import VenueManager from './DashBoards/OrganizerDashboard/VenueManager';
import AdminVerificationManager from './DashBoards/adminDashboard/Adminverificationmanager';
import AdminEventManager from './DashBoards/adminDashboard/AdminEventManager';
import AdminProfileManager from './DashBoards/adminDashboard/AdminUserProfile';
import { UserDashBoard } from './pages/UserDashboard';
import UserProfileManager from './DashBoards/dashboard/UserProfileManager';
import MyBookings from './DashBoards/dashboard/MyBookings';
import MyTickets from './DashBoards/dashboard/TicketManager';
import AdminOrganizationManager from './DashBoards/adminDashboard/Adminorganizationmanager ';
import AdminWalletManager from './DashBoards/adminDashboard/AdminWalletManager';
import AdminAnalytics from './DashBoards/adminDashboard/AdminAnalytics';
import PrivacyPolicy from './pages/Privacypolicy';
import TermsAndConditions from './pages/Termsandconditions';
import PaymentVerify from './pages/PaymentVerify';
import MyPayments from './DashBoards/dashboard/Payments';
import UserAnalytics from './DashBoards/dashboard/UserAnalytics';
import EventSalesReport from './DashBoards/OrganizerDashboard/EventSalesReport';
import AdminRefunds from './DashBoards/adminDashboard/AdminRefunds';
import OrganizerRefunds from './DashBoards/OrganizerDashboard/OrganizerRefunds';

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
        { path: '/privacy-policy', element: <PrivacyPolicy /> },
        { path: '/terms-and-conditions', element: <TermsAndConditions /> },
        { path: '/events/:slug', element: <EventSlugPage /> },
        { path: '/login', element: <Login /> },
        { path: '/pricing', element: <PricingSection /> },
        { path: '/register', element: <Register /> },
        { path: '/contact', element: <ContactForm /> },
        { path: "/email-verification", element: <EmailVerification />, errorElement: <Error /> },
        { path: "/forgot-password", element: <ForgotPassword />, errorElement: <Error /> },
        { path: "/reset-password/:token", element: <ResetPassword />, errorElement: <Error /> },
        { path: '/tickets/view/:ticketToken', element: <TicketViewPage /> }, 
        { path: "/payment/verify", element: <PaymentVerify /> },
      ],
    },

    {
      path: 'user-dashboard',
      element: (
        <ProtectedRoutes>
          <UserDashBoard />
        </ProtectedRoutes>
      ),
      errorElement: <Error />,
      children: [
        { path: 'profile', element: <UserProfileManager /> },
        { path: 'my-bookings', element: <MyBookings /> },
        { path: 'supportTickets', element: <UserSupportTickets /> },
        { path: 'payments', element: <MyPayments /> },
        { path: 'tickets', element: <MyTickets /> },
        { path: 'analytics', element: <UserAnalytics /> },

      ],
    },
    {
      path: 'admin-dashboard',
      element: (
        <ProtectedRoutes>
          <AdminDashBoard />
        </ProtectedRoutes>
      ),
      errorElement: <Error />,
      children: [
        { path: 'analytics', element: <AdminAnalytics /> },
        { path: 'verification', element: <AdminVerificationManager /> },
        { path: 'wallets', element: <AdminWalletManager /> },
        { path: 'supportTickets', element: <AdminSupportTickets /> },
        { path: 'users', element: <AdminManageUsers/> },
        { path: 'organizations', element: <AdminOrganizationManager /> },
        { path: 'events', element: <AdminEventManager /> },
        { path: 'ticketTypes', element: <TicketTypes /> },
        { path: 'AllPayments', element: <AllPayments /> },
        { path: 'profile', element: <AdminProfileManager /> },
        { path: 'SalesReports', element: <SalesReport /> },
        { path:"refunds", element: <AdminRefunds/>}
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
        { path: 'tickets', element: <TicketsManager /> },
        { path: 'analytics', element: <AnalyticsManager /> },
        { path: 'wallet', element: <WalletManager /> },
        { path: 'profile', element: <OrganizerProfileManager /> },
        { path: 'my-venues', element: <VenueManager /> },
        { path: 'sales-report', element: <EventSalesReport /> },
        { path: 'REFUNDS', element: <OrganizerRefunds /> },
     
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