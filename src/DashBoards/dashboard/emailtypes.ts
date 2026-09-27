export interface User {
  firstName: string;
  lastName: string;
  email: string;
}

export interface TicketType {
  name: string;
  price: string;
}

export interface Event {
  name: string;
}

export interface Booking {
  bookingId: string;
  eventId: string;
  event?: Event;
  ticketType?: TicketType;
  quantity: number;
  paymentStatus?: string;
  createdAt: string;
}

export interface EnrichedBooking {
  bookingId: string;
  eventName: string;
  ticketType: {
    name: string;
    price: string;
  };
  quantity: number;
  paymentStatus?: string;
  createdAt: string;
}
