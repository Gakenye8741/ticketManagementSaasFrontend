// TicketDocument.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: 'Helvetica' },
  title: { fontSize: 24, marginBottom: 10 },
  section: { marginBottom: 8 },
  label: { fontWeight: 'bold' },
  hr: { borderBottomWidth: 1, borderBottomColor: '#ccc', marginVertical: 12 },
  footer: { marginTop: 20 },
});

interface TicketDocumentProps {
  payment: any;
}

const TicketDocument: React.FC<TicketDocumentProps> = ({ payment }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>🎟️ Event Ticket</Text>
      <View style={styles.section}>
        <Text><Text style={styles.label}>Transaction ID:</Text> {payment.transactionId}</Text>
      </View>
      <View style={styles.section}>
        <Text><Text style={styles.label}>Booking ID:</Text> {payment.bookingId}</Text>
      </View>
      <View style={styles.section}>
        <Text><Text style={styles.label}>Amount:</Text> ${(Number(payment.amount) / 100).toFixed(2)}</Text>
      </View>
      <View style={styles.section}>
        <Text><Text style={styles.label}>Status:</Text> {payment.paymentStatus}</Text>
      </View>
      <View style={styles.section}>
        <Text><Text style={styles.label}>Payment Method:</Text> {payment.paymentMethod || 'N/A'}</Text>
      </View>
      <View style={styles.section}>
        <Text><Text style={styles.label}>Date:</Text> {new Date(payment.paymentDate).toLocaleString()}</Text>
      </View>
      <View style={styles.hr} />
      <Text style={styles.footer}>✅ Thank you for your purchase!</Text>
    </Page>
  </Document>
);

export default TicketDocument;
