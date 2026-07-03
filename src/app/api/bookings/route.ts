import { NextResponse } from "next/server";

interface BookingRecord {
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

const bookingsStore: BookingRecord[] = [
  {
    id: "bk-1",
    clientId: "c1",
    clientName: "Safaricom",
    inventoryId: "inv-3",
    inventoryName: "CBD Upper Hill Junction",
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    status: "confirmed",
    totalPrice: 190000,
    createdAt: "2026-05-15",
  },
  {
    id: "bk-2",
    clientId: "c2",
    clientName: "Airtel Kenya",
    inventoryId: "inv-6",
    inventoryName: "Nyayo Stadium Roundabout",
    startDate: "2026-06-10",
    endDate: "2026-08-15",
    status: "confirmed",
    totalPrice: 242000,
    createdAt: "2026-05-20",
  },
  {
    id: "bk-3",
    clientId: "c3",
    clientName: "P&G East Africa",
    inventoryId: "inv-1",
    inventoryName: "Westlands Roundabout — Screen A",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    status: "pending",
    totalPrice: 255000,
    createdAt: "2026-06-20",
  },
  {
    id: "bk-4",
    clientId: "c4",
    clientName: "Bidco Africa",
    inventoryId: "inv-2",
    inventoryName: "Mombasa Road Super-size",
    startDate: "2026-08-01",
    endDate: "2026-10-31",
    status: "pending",
    totalPrice: 360000,
    createdAt: "2026-06-22",
  },
  {
    id: "bk-5",
    clientId: "c5",
    clientName: "Java House",
    inventoryId: "inv-4",
    inventoryName: "Thika Road Mall Entrance",
    startDate: "2026-05-01",
    endDate: "2026-06-30",
    status: "completed",
    totalPrice: 110000,
    createdAt: "2026-04-10",
  },
];

function hasDateOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();
  return aStart < bEnd && aEnd > bStart;
}

export async function GET() {
  return NextResponse.json({ bookings: bookingsStore });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      clientName,
      inventoryId,
      inventoryName,
      startDate,
      endDate,
      totalPrice,
    } = body;

    if (!clientId || !inventoryId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const conflictingBooking = bookingsStore.find(
      (b) =>
        b.inventoryId === inventoryId &&
        b.status !== "cancelled" &&
        b.status !== "completed" &&
        hasDateOverlap(startDate, endDate, b.startDate, b.endDate)
    );

    if (conflictingBooking) {
      return NextResponse.json(
        {
          error: "Double-booking detected",
          details: `This inventory is already booked by ${conflictingBooking.clientName} from ${conflictingBooking.startDate} to ${conflictingBooking.endDate}`,
          conflictingBookingId: conflictingBooking.id,
        },
        { status: 409 }
      );
    }

    const newBooking: BookingRecord = {
      id: `bk-${Date.now()}`,
      clientId,
      clientName: clientName || "Unknown Client",
      inventoryId,
      inventoryName: inventoryName || "Unknown Inventory",
      startDate,
      endDate,
      status: "pending",
      totalPrice: totalPrice || 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    bookingsStore.push(newBooking);

    return NextResponse.json({ booking: newBooking }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
