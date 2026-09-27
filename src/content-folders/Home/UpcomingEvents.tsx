import { useState } from 'react';
import jsPDF from 'jspdf';
import menArmy from '../../assets/download.jpeg'; // Replace with your actual path
import './Home.scss';

type TicketType = 'Standard' | 'VIP' | 'Student';

type EventType = {
  title: string;
  description: string;
  image: string;
  date: string;
  location: string;
  tag: string;
  action: string;
  color: string;
};

type CartItem = EventType & {
  quantity: number;
  ticketType: TicketType;
  price: number;
  total: number;
};

export const UpcomingEvents = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [ticketType, setTicketType] = useState<TicketType>('Standard');
  const [cart, setCart] = useState<CartItem[]>([]);

  const ticketPrices: Record<TicketType, number> = {
    Standard: 1000,
    VIP: 2000,
    Student: 500,
  };

  const events: EventType[] = [
    {
      title: 'Live Music Night',
      description: 'Feel the rhythm and vibe with live bands performing under the stars.',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      date: 'Aug 12, 2025',
      location: 'City Amphitheater, Nairobi',
      tag: 'Music',
      action: 'Buy Tickets',
      color: 'btn-primary',
    },
    {
      title: 'Three Men Army Show',
      description: 'Frankie, Trevor & Dante deliver an explosive night of stand-up comedy.',
      image: menArmy,
      date: 'Aug 25, 2025',
      location: 'The Laugh Dome, Mombasa',
      tag: 'Comedy',
      action: 'More Details',
      color: 'btn-secondary',
    },
    {
      title: 'Street Food Festival',
      description: 'Indulge in flavors from around the world at our food carnival.',
      image: 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=800&q=80',
      date: 'Sept 2, 2025',
      location: 'Downtown Street, Kisumu',
      tag: 'Food',
      action: 'Explore',
      color: 'btn-accent',
    },
    {
      title: 'Outdoor Movie Night',
      description: 'Watch classics under the stars with popcorn and friends.',
      image: 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?auto=format&fit=crop&w=800&q=80',
      date: 'Sept 10, 2025',
      location: 'River Park, Eldoret',
      tag: 'Film',
      action: 'Reserve Seat',
      color: 'btn-info',
    },
    {
      title: 'Tech Innovators Meetup',
      description: 'Connect with founders, coders & creators changing the tech world.',
      image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde16?auto=format&fit=crop&w=800&q=80',
      date: 'Sept 22, 2025',
      location: 'Tech Hub Arena, Nakuru',
      tag: 'Conference',
      action: 'Register',
      color: 'btn-warning',
    },
    {
      title: 'Art & Craft Expo',
      description: 'Discover handmade crafts, live demos, and local talent.',
      image: 'https://images.unsplash.com/photo-1522780209446-8f57f1d20739?auto=format&fit=crop&w=800&q=80',
      date: 'Oct 5, 2025',
      location: 'Creative Grounds, Thika',
      tag: 'Art',
      action: 'View Details',
      color: 'btn-success',
    },
  ];

  const openBooking = (event: EventType) => {
    setSelectedEvent(event);
    setTicketCount(1);
    setTicketType('Standard');
    (document.getElementById('booking_modal') as HTMLDialogElement).showModal();
  };

  const addToCart = () => {
    if (selectedEvent) {
      const price = ticketPrices[ticketType];
      const total = price * ticketCount;
      const item: CartItem = {
        ...selectedEvent,
        quantity: ticketCount,
        ticketType,
        price,
        total,
      };
      setCart((prev) => [...prev, item]);
    }
    (document.getElementById('booking_modal') as HTMLDialogElement).close();
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + item.total, 0);

  const downloadTicketsAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('🎫 Your Event Tickets', 20, 20);

    let y = 30;
    cart.forEach((item, index) => {
      doc.setFontSize(12);
      doc.text(`Event: ${item.title}`, 20, y);
      doc.text(`Date: ${item.date}`, 20, y + 6);
      doc.text(`Location: ${item.location}`, 20, y + 12);
      doc.text(`Ticket Type: ${item.ticketType}`, 20, y + 18);
      doc.text(`Quantity: ${item.quantity}`, 20, y + 24);
      doc.text(`Total: KES ${item.total}`, 20, y + 30);
      doc.line(20, y + 34, 190, y + 34);
      y += 44;
      if (y > 270 && index < cart.length - 1) {
        doc.addPage();
        y = 20;
      }
    });

    doc.setFontSize(14);
    doc.text(`Grand Total: KES ${calculateTotal()}`, 20, y + 10);
    doc.save('tickets.pdf');
  };

  const simulateStripeCheckout = () => {
    alert('✅ Payment processed successfully (Stripe simulation)');
    downloadTicketsAsPDF();
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-white via-slate-100 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6 text-primary">🎫 Upcoming Events</h1>

        {cart.length > 0 && (
          <div className="text-right mb-8">
            <button
              className="btn btn-outline btn-info"
              onClick={() => (document.getElementById('cart_modal') as HTMLDialogElement).showModal()}
            >
              🛒 View Cart ({cart.length})
            </button>
          </div>
        )}

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => (
            <div
              key={index}
              className="card w-full glass shadow-lg hover:shadow-2xl transition duration-300 ease-in-out backdrop-blur-md border border-white/10"
            >
              <figure className="relative">
                <img src={event.image} alt={event.title} className="w-full h-48 object-cover rounded-t-xl" />
                <span className="absolute top-2 right-2 badge badge-secondary text-white text-xs px-3 py-1 shadow-md">
                  {event.tag}
                </span>
              </figure>
              <div className="card-body text-left">
                <h2 className="card-title text-lg md:text-xl">{event.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  📍 <strong>{event.location}</strong><br />
                  📅 {event.date}
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className={`btn ${event.color} btn-sm md:btn-md`} onClick={() => openBooking(event)}>
                    {event.action}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Modal */}
        <dialog id="booking_modal" className="modal">
          <div className="modal-box">
            {selectedEvent && (
              <>
                <h3 className="font-bold text-lg mb-2">🎟 Book for {selectedEvent.title}</h3>
                <p className="text-sm mb-4 text-gray-500">{selectedEvent.date} at {selectedEvent.location}</p>

                <label className="block mb-2 font-medium">Ticket Type:</label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value as TicketType)}
                  className="select select-bordered w-full mb-4"
                >
                  <option value="Standard">Standard - KES 1000</option>
                  <option value="VIP">VIP - KES 2000</option>
                  <option value="Student">Student - KES 500</option>
                </select>

                <label className="block mb-2 font-medium">Select Quantity:</label>
                <div className="flex items-center gap-3 mb-4">
                  <button className="btn btn-sm btn-outline" onClick={() => setTicketCount((n) => Math.max(1, n - 1))}>-</button>
                  <span className="text-lg">{ticketCount}</span>
                  <button className="btn btn-sm btn-outline" onClick={() => setTicketCount((n) => n + 1)}>+</button>
                </div>

                <p className="mb-4 text-md">Total: <strong>KES {ticketPrices[ticketType] * ticketCount}</strong></p>

                <button className="btn btn-primary w-full" onClick={addToCart}>
                  Add to Cart
                </button>
              </>
            )}
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
            </div>
          </div>
        </dialog>

        {/* Cart Modal */}
        <dialog id="cart_modal" className="modal">
          <div className="modal-box max-w-3xl">
            <h2 className="text-xl font-bold mb-4">🛒 Your Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">Your cart is empty.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {cart.map((item, index) => (
                    <li
                      key={index}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          🎟 {item.ticketType} | KES {item.price} × {item.quantity}
                        </p>
                        <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">📅 {item.date}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-3 sm:mt-0">
                        <span className="font-medium">KES {item.total}</span>
                        <button
                          className="btn btn-sm btn-error btn-outline"
                          onClick={() => setCart((prev) => prev.filter((_, i) => i !== index))}
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <hr className="my-4" />
                <div className="text-right font-bold text-lg">Total: KES {calculateTotal()}</div>

                <div className="text-right mt-4 flex flex-col gap-3">
                  <button className="btn btn-success w-full" onClick={simulateStripeCheckout}>
                    💳 Generate Tickets (Pay via Stripe)
                  </button>
                  <button className="btn btn-outline" onClick={downloadTicketsAsPDF}>
                    ⬇️ Download as PDF
                  </button>
                </div>
              </>
            )}
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
            </div>
          </div>
        </dialog>
      </div>
    </section>
  );
};
