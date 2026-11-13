export const geocodeAddressAgent = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lu&q=${encodeURIComponent(address)}`;
    const r = await fetch(url);
    const data = await r.json();
    return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  } catch { return null; }
};
