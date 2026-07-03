import React from "react";

export interface Conversation {
  id: string;
  contactName: string;
  contactInitials: string;
  channel: "whatsapp" | "email";
  preview: string;
  time: string;
  unread: number;
  projectName?: string;
  pipelineValue?: string;
  status: "open" | "closed";
  autoReply?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  text: string;
  time: string;
  channel: "whatsapp" | "email";
  senderName?: string;
  isAutomation?: boolean;
}

export interface InventoryItem {
  id: string;
  type: "Digital Screen" | "Billboard" | "Banner Site" | "Backlit";
  name: string;
  location: string;
  area: string;
  size: string;
  resolution: string;
  dailyImpressions: number;
  price: number;
  status: "available" | "booked";
  bookedBy?: string;
  bookedUntil?: string;
  imageGradient?: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  inventoryId: string;
  inventoryName: string;
  startDate: string;
  endDate: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  totalPrice: number;
  createdAt: string;
}
