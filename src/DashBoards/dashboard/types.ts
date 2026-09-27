// types.ts
export interface User {
  firstName: string;
  lastName: string;
  nationalId: number;
  email: string;
  phoneNumber?: string;
}

export interface Event {
  eventId: number;
  title: string;
  location?: string;
  eventDate?: string;
}

export interface TicketType {
  ticketTypeId: number;
  name: string;
  price: string;
}

export interface Booking {
  bookingId: number;
  ticketTypeId: number;
  eventId: number;
  quantity: number;
  createdAt: string;
  bookingStatus?: string;
  checkoutRequestId?: string;
}

export interface Payment {
  paymentId: number;
  bookingId: number;
  nationalId: number;
  eventId: number;
  ticketTypeId: number;
  amount: string | number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
}

export interface TicketDocumentProps {
  user: User;
  event: Event;
  ticketType: TicketType;
  booking: Booking;
  payment?: Payment;
  total: number;
  paymentStatus: string;
}