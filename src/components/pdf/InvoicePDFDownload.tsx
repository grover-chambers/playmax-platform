"use client";

import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Download } from "lucide-react";

interface InvoiceData {
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  line_items?: Record<string, unknown>[] | null;
  projects?: { name: string }[] | null;
  client_name?: string;
  client_company?: string;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  brand: { fontSize: 22, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2 },
  statusText: { fontSize: 9, textTransform: "uppercase", marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#666", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  colDesc: { width: "40%" },
  colQty: { width: "20%", textAlign: "right" },
  colRate: { width: "20%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  totalValue: { fontSize: 14, fontWeight: "bold" },
  notesBox: { backgroundColor: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 10, marginTop: 10 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 9, color: "#999", borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 10 },
});

function InvoicePDFDoc({ invoice }: { invoice: InvoiceData }) {
  const lineItems = Array.isArray(invoice.line_items)
    ? invoice.line_items as Array<{ description?: string; quantity?: number; rate?: number; amount?: number }>
    : [];
  const total = invoice.amount;
  const statusColor = invoice.status === "paid" ? "#059669" : invoice.status === "overdue" ? "#dc2626" : "#d97706";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PlayMax</Text>
            <Text style={{ fontSize: 9, color: "#666", marginTop: 4 }}>Oxygen Media House, Nairobi, Kenya</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{invoice.invoice_number}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={{ fontSize: 11 }}>{invoice.client_name || "Client"}</Text>
          {invoice.client_company && <Text style={{ fontSize: 10, color: "#444" }}>{invoice.client_company}</Text>}
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.row}><Text style={{ fontSize: 10, color: "#666" }}>Issued: {formatDate(invoice.issued_date)}</Text></View>
          <View style={styles.row}><Text style={{ fontSize: 10, color: "#666" }}>Due: {formatDate(invoice.due_date)}</Text></View>
          {invoice.paid_date && <View style={styles.row}><Text style={{ fontSize: 10, color: "#059669" }}>Paid: {formatDate(invoice.paid_date)}</Text></View>}
        </View>

        {invoice.projects?.[0]?.name && (
          <View style={styles.section}>
            <Text style={{ fontSize: 10 }}><Text style={{ fontWeight: "bold" }}>Project: </Text>{invoice.projects[0].name}</Text>
          </View>
        )}

        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 6, marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, styles.colDesc]}>Description</Text>
            <Text style={[styles.sectionTitle, styles.colQty]}>Qty</Text>
            <Text style={[styles.sectionTitle, styles.colRate]}>Rate</Text>
            <Text style={[styles.sectionTitle, styles.colAmount]}>Amount</Text>
          </View>
          {lineItems.length > 0 ? lineItems.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 6 }}>
              <Text style={[styles.colDesc, { fontSize: 10 }]}>{item.description || "Service"}</Text>
              <Text style={[styles.colQty, { fontSize: 10 }]}>{item.quantity || 1}</Text>
              <Text style={[styles.colRate, { fontSize: 10 }]}>{formatCurrency(item.rate || 0)}</Text>
              <Text style={[styles.colAmount, { fontSize: 10 }]}>{formatCurrency(item.amount || 0)}</Text>
            </View>
          )) : (
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 6 }}>
              <Text style={[styles.colDesc, { fontSize: 10 }]}>Services rendered</Text>
              <Text style={[styles.colQty, { fontSize: 10 }]}>—</Text>
              <Text style={[styles.colRate, { fontSize: 10 }]}>—</Text>
              <Text style={[styles.colAmount, { fontSize: 10 }]}>{formatCurrency(total)}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", borderTopWidth: 2, borderTopColor: "#111", paddingTop: 6, marginTop: 6 }}>
            <Text style={[styles.colDesc, { fontSize: 10, fontWeight: "bold" }]}>Total</Text>
            <Text style={[styles.colQty, { fontSize: 10, fontWeight: "bold" }]}> </Text>
            <Text style={[styles.colRate, { fontSize: 10, fontWeight: "bold" }]}> </Text>
            <Text style={[styles.colAmount, styles.totalValue]}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notesBox}>
            <Text style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#666", marginBottom: 4 }}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>Thank you for your business · Payment due within 30 days</Text>
      </Page>
    </Document>
  );
}

export default function InvoicePDFDownload({ invoice }: { invoice: InvoiceData }) {
  const handleDownload = async () => {
    const blob = await pdf(<InvoicePDFDoc invoice={invoice} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      <Download size={13} />
      Download PDF
    </button>
  );
}
