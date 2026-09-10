/**
 * GPS validity helpers shared by census/routes/monitoring APIs so a single
 * (0,0) or null reading can never render as a bogus map pin.
 */

/** True when a lat/lng pair is inside the Kenya band (-5..5, 33..43). */
export function hasValidGps(o: {
  gps_lat?: number | string | null;
  gps_lng?: number | string | null;
}): boolean {
  const lat = Number(o.gps_lat);
  const lng = Number(o.gps_lng);
  if (!isFinite(lat) || !isFinite(lng)) return false;
  return lat >= -5 && lat <= 5 && lng >= 33 && lng <= 43;
}

export type AccuracyTier = "high" | "medium" | "manual";
export function hasUsableGps(o: { gps_final_lat?: number|null; gps_final_lng?: number|null; gps_lat?: number|null; gps_lng?: number|null }): boolean {
  const lat = o.gps_final_lat ?? o.gps_lat;
  const lng = o.gps_final_lng ?? o.gps_lng;
  return hasValidGps({ gps_lat: lat as number, gps_lng: lng as number });
}
export function tierColor(t?: string|null): string {
  if (t==="high") return "#16a34a";
  if (t==="medium") return "#f59e0b";
  if (t==="manual") return "#ca8a04";
  return "#94a3b8";
}