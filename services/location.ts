export type GeoResult = { ok: true; lat: number; lng: number } | { ok: false; message: string };

export const getUserPosition = (): Promise<GeoResult> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, message: "La géolocalisation n'est pas disponible sur cet appareil. Saisissez une adresse." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => resolve({
        ok: false,
        message: e.code === 1
          ? "Localisation refusée. Sur iPhone : Réglages > Confidentialité et sécurité > Service de localisation (activé), puis Safari (sites web) ou Food Track > « En utilisant l'app ». Ou saisissez une adresse ci-dessous."
          : "Position introuvable pour le moment. Réessayez ou saisissez une adresse ci-dessous.",
      }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
