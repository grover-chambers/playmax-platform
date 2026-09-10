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