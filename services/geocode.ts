export const geocodeAddressAgent = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lu&q=${encodeURIComponent(address)}`;
    const r = await fetch(url);
    const data = await r.json();
    return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  } catch { return null; }
};

// Position GPS -> adresse (OpenStreetMap). Sert à valider automatiquement qu'on est bien au Luxembourg.
export const reverseGeocodeAgent = async (lat: number, lng: number): Promise<{ address: string; inLuxembourg: boolean } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d || d.error) return null;
    const a = d.address || {};
    const road = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ');
    const town = a.suburb || a.city_district || a.village || a.town || a.city || a.municipality || '';
    const address = [road, town].filter(Boolean).join(', ') || d.display_name || '';
    return { address, inLuxembourg: a.country_code === 'lu' };
  } catch { return null; }
};
