/**
 * Distance + transport estimate via Google Maps Distance Matrix.
 *
 * If GOOGLE_MAPS_API_KEY is not set (or MOCK_THIRD_PARTY=true), we fall back
 * to a coarse Haversine over coordinates and a per-km cost model.
 *
 * Returns: { distanceKm, durationMin, transportEstimateNaira }
 */
const axios = require('axios');

const PER_KM_NAIRA = Number(process.env.TRANSPORT_PER_KM_NAIRA || 250); // bus/keke estimate

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function distanceFromGoogle(origin, destination) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const params = {
    origins: `${origin.lat},${origin.lng}`,
    destinations: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`,
    key,
    mode: 'driving',
    region: 'ng',
  };
  const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', { params, timeout: 8000 });
  const elem = data?.rows?.[0]?.elements?.[0];
  if (!elem || elem.status !== 'OK') return null;
  return {
    distanceKm: Number((elem.distance.value / 1000).toFixed(2)),
    durationMin: Math.round(elem.duration.value / 60),
  };
}

async function estimateDistanceAndTransport({ propertyCoords, anchor }) {
  // anchor is either coords or a string like "University of Ibadan, Ibadan"
  let result = null;
  if (process.env.MOCK_THIRD_PARTY !== 'true' && process.env.GOOGLE_MAPS_API_KEY) {
    try { result = await distanceFromGoogle(propertyCoords, anchor); } catch {}
  }
  if (!result && propertyCoords && typeof anchor === 'object') {
    const km = haversineKm(propertyCoords, anchor);
    if (km != null) result = { distanceKm: Number(km.toFixed(2)), durationMin: Math.round(km * 3) };
  }
  if (!result) return { distanceKm: null, durationMin: null, transportEstimateNaira: null };
  return {
    distanceKm: result.distanceKm,
    durationMin: result.durationMin,
    transportEstimateNaira: Math.round(result.distanceKm * PER_KM_NAIRA * 2), // round-trip
  };
}

module.exports = { estimateDistanceAndTransport, haversineKm };
