import { NextResponse } from "next/server";

const inventoryItems = [
  {
    id: "inv-1",
    type: "Digital Screen",
    name: "Westlands Roundabout — Screen A",
    location: "Westlands, Nairobi",
    area: "Westlands",
    size: "6×3m",
    resolution: "1080p LED",
    dailyImpressions: 220000,
    price: 85000,
    status: "available",
  },
  {
    id: "inv-2",
    type: "Billboard",
    name: "Mombasa Road Super-size",
    location: "Industrial Area, Nairobi",
    area: "Industrial Area",
    size: "12×4m",
    resolution: "Static Print",
    dailyImpressions: 180000,
    price: 120000,
    status: "available",
  },
  {
    id: "inv-3",
    type: "Billboard",
    name: "CBD Upper Hill Junction",
    location: "Upper Hill, Nairobi",
    area: "Upper Hill",
    size: "8×3m",
    resolution: "Backlit",
    dailyImpressions: 150000,
    price: 95000,
    status: "booked",
    bookedBy: "Safaricom",
    bookedUntil: "31 Jul 2026",
  },
  {
    id: "inv-4",
    type: "Digital Screen",
    name: "Thika Road Mall Entrance",
    location: "Kasarani, Nairobi",
    area: "Kasarani",
    size: "4×2.5m",
    resolution: "4K LED",
    dailyImpressions: 95000,
    price: 55000,
    status: "available",
  },
  {
    id: "inv-5",
    type: "Digital Screen",
    name: "Westlands Roundabout — Screen B",
    location: "Westlands, Nairobi",
    area: "Westlands",
    size: "6×3m",
    resolution: "1080p LED",
    dailyImpressions: 220000,
    price: 85000,
    status: "available",
  },
  {
    id: "inv-6",
    type: "Billboard",
    name: "Nyayo Stadium Roundabout",
    location: "South C, Nairobi",
    area: "South C",
    size: "10×4m",
    resolution: "Static Print",
    dailyImpressions: 160000,
    price: 110000,
    status: "booked",
    bookedBy: "Airtel Kenya",
    bookedUntil: "15 Aug 2026",
  },
  {
    id: "inv-7",
    type: "Banner Site",
    name: "Kenyatta Avenue — East",
    location: "CBD, Nairobi",
    area: "CBD",
    size: "3×1.5m",
    resolution: "Flex Print",
    dailyImpressions: 45000,
    price: 35000,
    status: "available",
  },
  {
    id: "inv-8",
    type: "Billboard",
    name: "Waiyaki Way — Uthiru",
    location: "Uthiru, Nairobi",
    area: "Uthiru",
    size: "8×3m",
    resolution: "Static Print",
    dailyImpressions: 120000,
    price: 70000,
    status: "available",
  },
];

export async function GET() {
  return NextResponse.json({ inventory: inventoryItems });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      name,
      location,
      area,
      size,
      resolution,
      dailyImpressions,
      price,
    } = body;

    if (!type || !name || !location || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newItem = {
      id: `inv-${Date.now()}`,
      type,
      name,
      location,
      area: area || location,
      size: size || "",
      resolution: resolution || "",
      dailyImpressions: dailyImpressions || 0,
      price,
      status: "available",
    };

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
