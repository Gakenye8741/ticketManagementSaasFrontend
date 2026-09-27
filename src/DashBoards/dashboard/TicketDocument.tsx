import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { TicketDocumentProps } from './types';

interface ExtendedTicketDocumentProps extends TicketDocumentProps {
  qrCodeUrl?: string;
  venue?: string;
  eventDate?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    fontSize: 8.5,
    color: '#1A1A1A',
  },
  borderFrame: {
    border: '1.5pt solid #4f46e5',
    height: '100%',
    padding: 16,
    position: 'relative',
    borderRadius: 6,
  },
  noticeBox: {
    backgroundColor: '#FEF2F2',
    border: '1pt solid #FECACA',
    color: '#991B1B',
    padding: 6,
    marginBottom: 10,
    textAlign: 'center',
    borderRadius: 4,
  },
  noticeTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  noticeDesc: {
    fontSize: 6,
    marginTop: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1pt solid #E5E7EB',
    paddingBottom: 8,
    marginBottom: 10,
  },
  brand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  badge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    padding: '3 8',
    borderRadius: 10,
    fontSize: 7,
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#4f46e5',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  gridTwoColumns: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    border: '0.5pt solid #E5E7EB',
  },
  label: {
    fontSize: 6,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  value: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  table: {
    marginTop: 2,
    borderTop: '0.5pt solid #E5E7EB',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #F3F4F6',
    paddingVertical: 5,
  },
  tableLabel: {
    flex: 1,
    fontSize: 8,
    color: '#4B5563',
  },
  tableValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 8,
    fontWeight: 'bold',
  },
  totalContainer: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '0.5pt solid #C7D2FE',
    marginBottom: 10,
  },
  totalTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#312E81',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 6,
  },
  qrCodeImage: {
    width: 60,
    height: 60,
  },
  footerSection: {
    marginTop: 'auto',
    paddingTop: 8,
    borderTop: '1pt dashed #E5E7EB',
    textAlign: 'center',
  },
  securityHashText: {
    fontFamily: 'Courier',
    fontSize: 6,
    color: '#9CA3AF',
    marginTop: 2,
  },
  systemFooter: {
    fontSize: 6.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
  }
});

const TicketDocument: React.FC<ExtendedTicketDocumentProps> = ({
  user,
  event,
  ticketType,
  booking,
  payment,
  total,
  paymentStatus,
  qrCodeUrl,
  venue,
  eventDate,
}) => {
  // Resolve complete identifiers across props, nested properties, or fallbacks
  const txnId = payment?.transactionId || (booking as any)?.transactionId || 'N/A';
  const payId = payment?.paymentId;
  const payMethod = payment?.paymentMethod || (booking as any)?.paymentMethod || 'M-Pesa';
  const payDate = payment?.paymentDate || (booking as any)?.paymentDate || booking.createdAt;
  const resolvedVenue = venue || event.location || 'Laikipia University Grounds, Nyahururu';
  const resolvedEventDate = eventDate || event.eventDate || 'TBA';

  const securityHash = `TXN-${txnId}-${user.nationalId}-${Date.now()}`.toUpperCase();

  return (
    <Document title={`TICKET_${event.title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.borderFrame}>
          
          {/* Notice Box */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>OFFICIAL VERIFIED BOOKING & TRANSACTION RECEIPT</Text>
            <Text style={styles.noticeDesc}>
              Present this digital pass or printed copy along with your National ID at the gate for validation.
            </Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brand}>TICKETSTREAM TICKETS</Text>
            <View style={styles.badge}>
              <Text>STATUS: {paymentStatus.toUpperCase()}</Text>
            </View>
          </View>

          {/* Event Title */}
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Detailed Information Grid */}
          <Text style={styles.sectionTitle}>Attendee & Transaction Profile</Text>
          <View style={styles.gridTwoColumns}>
            <View style={styles.card}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{user.firstName} {user.lastName}</Text>
              
              <Text style={[styles.label, { marginTop: 5 }]}>National ID Number</Text>
              <Text style={styles.value}>{user.nationalId}</Text>
              
              <Text style={[styles.label, { marginTop: 5 }]}>Email Address</Text>
              <Text style={styles.value}>{user.email || 'Not Provided'}</Text>

              <Text style={[styles.label, { marginTop: 5 }]}>Phone Number</Text>
              <Text style={styles.value}>{user.phoneNumber || '+254 **** *** ***'}</Text>

              <Text style={[styles.label, { marginTop: 5 }]}>Booking Reference ID</Text>
              <Text style={styles.value}>#BK-{booking.bookingId}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Transaction ID</Text>
              <Text style={styles.value}>#{txnId}</Text>
              
              <Text style={[styles.label, { marginTop: 5 }]}>Payment Method</Text>
              <Text style={styles.value}>{payMethod}</Text>

              <Text style={[styles.label, { marginTop: 5 }]}>Payment Date & Time</Text>
              <Text style={styles.value}>{new Date(payDate).toLocaleString('en-KE')}</Text>

              <Text style={[styles.label, { marginTop: 5 }]}>Event Date / Venue</Text>
              <Text style={styles.value}>{resolvedEventDate} @ {resolvedVenue}</Text>

              <Text style={[styles.label, { marginTop: 5 }]}>Booking Timestamp</Text>
              <Text style={styles.value}>{new Date(booking.createdAt).toLocaleString('en-KE')}</Text>
            </View>
          </View>

          {/* Itemized Breakdown Table */}
          <Text style={styles.sectionTitle}>Itemized Payment Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Ticket Tier / Category</Text>
              <Text style={styles.tableValue}>{ticketType.name}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Price Per Ticket Unit</Text>
              <Text style={styles.tableValue}>KSH {Number(ticketType.price).toLocaleString('en-KE')}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Quantity Purchased</Text>
              <Text style={styles.tableValue}>{booking.quantity} Unit(s)</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Payment Reference Ledger ID</Text>
              <Text style={styles.tableValue}>#{payId}</Text>
            </View>
          </View>

          {/* Total Paid Highlight Box */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalTitle}>TOTAL AMOUNT CLEARED</Text>
            <Text style={styles.totalAmount}>KSH {total.toLocaleString('en-KE')}</Text>
          </View>

          {/* Optional QR Verification Code */}
          {qrCodeUrl && (
            <View style={styles.qrSection}>
              <Image style={styles.qrCodeImage} src={qrCodeUrl} />
            </View>
          )}

          {/* Security & Verification Footnote */}
          <View style={styles.footerSection}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#374151' }}>CRYPTOGRAPHIC DATA INTEGRITY VERIFIED</Text>
            <Text style={{ fontSize: 6.5, color: '#6B7280', marginTop: 1 }}>
              Keep this document secure for auditing, gate admission, and personal validation.
            </Text>
            <Text style={styles.securityHashText}>SEC_HASH: {securityHash}</Text>
          </View>

        </View>

        <Text style={styles.systemFooter}>
          Generated securely via TicketStream Systems © {new Date().getFullYear()} | Nyahururu, Kenya
        </Text>
      </Page>
    </Document>
  );
};

export default TicketDocument;