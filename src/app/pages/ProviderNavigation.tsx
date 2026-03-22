import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, MapPin, X, ChevronLeft, Navigation, User } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "../../lib/supabase";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function ProviderNavigation() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const [booking, setBooking]         = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo]     = useState<{ distance: string; duration: string } | null>(null);
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id, title, status, scheduled_at,
            client_id, provider_id,
            client:profiles!client_id(id, full_name, business_lat, business_lng),
            provider:profiles!provider_id(id, full_name, business_lat, business_lng)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error || !data) { setError("Could not load booking details."); return; }
        setBooking(data);

        // Get provider location
        const providerLoc = (data?.provider as any)?.business_lng && (data?.provider as any)?.business_lat
          ? [(data.provider as any).business_lng, (data.provider as any).business_lat] as [number, number]
          : null;

        if (providerLoc) {
          setOriginCoords(providerLoc);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => setOriginCoords([coords.longitude, coords.latitude]),
            () => console.warn("Geolocation unavailable."),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        }
      } catch (err) {
        console.error(err);
        setError("Error loading booking.");
      } finally { setLoading(false); }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    if (!booking || !mapContainer.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const origin: [number, number] | null = originCoords ||
      ((booking.provider as any)?.business_lng && (booking.provider as any)?.business_lat
        ? [(booking.provider as any).business_lng, (booking.provider as any).business_lat]
        : null);

    const destination: [number, number] | null = (booking.client as any)?.business_lng && (booking.client as any)?.business_lat
      ? [(booking.client as any).business_lng, (booking.client as any).business_lat]
      : null;

    if (!destination) { setError("Client location is missing for navigation."); return; }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: origin || destination,
      zoom: 13,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", async () => {
      // Provider marker (green)
      if (origin) {
        const el = document.createElement("div");
        el.style.cssText = "width:36px;height:36px;border-radius:50%;background:#10B981;border:3px solid white;box-shadow:0 2px 8px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;";
        el.innerHTML = "🔧";
        new mapboxgl.Marker({ element: el })
          .setLngLat(origin)
          .setPopup(new mapboxgl.Popup({ offset: 14 }).setText(`You: ${booking.provider?.full_name || "Provider"}`))
          .addTo(map);
      }

      // Client marker (blue)
      const el2 = document.createElement("div");
      el2.style.cssText = "width:36px;height:36px;border-radius:50%;background:#1E3A8A;border:3px solid white;box-shadow:0 2px 8px rgba(30,58,138,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;";
      el2.innerHTML = "📍";
      new mapboxgl.Marker({ element: el2 })
        .setLngLat(destination)
        .setPopup(new mapboxgl.Popup({ offset: 14 }).setText(`Client: ${booking.client?.full_name || "Client"}`))
        .addTo(map);

      // Draw route if we have origin
      if (origin) {
        setRouteLoading(true);
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
          const res  = await fetch(url);
          const json = await res.json();

          if (!json.routes?.length) throw new Error("No route found.");

          const route    = json.routes[0];
          const geometry = route.geometry;

          // Route info
          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.ceil(route.duration / 60);
          setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} min` });

          map.addSource("route", { type: "geojson", data: { type: "Feature", geometry, properties: {} } as any });
          map.addLayer({
            id: "route-casing",
            type: "line", source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.6 },
          });
          map.addLayer({
            id: "route",
            type: "line", source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#10B981", "line-width": 5, "line-opacity": 0.9 },
          });

          const bounds = new mapboxgl.LngLatBounds(origin, origin);
          for (const coord of geometry.coordinates as [number, number][]) bounds.extend(coord);
          bounds.extend(destination);
          map.fitBounds(bounds, { padding: 60 });
        } catch (err: any) {
          console.error("Directions error:", err);
          map.flyTo({ center: destination, zoom: 13 });
        } finally { setRouteLoading(false); }
      } else {
        map.flyTo({ center: destination, zoom: 13 });
      }
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [booking, originCoords]);

  const openExternalNav = () => {
    if (!booking?.client) return;
    const lat = (booking.client as any)?.latitude;
    const lng = (booking.client as any)?.longitude;
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <X className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-gray-700 text-sm">{error}</p>
      <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-[#1E3A8A] text-white rounded-xl text-sm">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A]/5 via-[#10B981]/5 to-[#14B8A6]/5">
      {/* Header */}
      <div className="bg-[#1E3A8A]/90 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 text-sm">
            <ChevronLeft className="w-4 h-4" />Back
          </button>
          <button onClick={openExternalNav}
            className="bg-[#10B981] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
            <Navigation className="w-3 h-3" />Open in Maps
          </button>
        </div>
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Navigate to Client</h1>
        <p className="text-white/70 text-sm">{booking.title}</p>

        {/* Route info pills */}
        {routeInfo && (
          <div className="flex gap-2 mt-3">
            <div className="bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-white text-xs font-medium">{routeInfo.distance}</span>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-white text-xs font-medium">{routeInfo.duration}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {/* Client info card */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1E3A8A]/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[#1E3A8A]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{booking.client?.full_name || "Client"}</p>
            <p className="text-xs text-gray-500">
              {(booking.client as any)?.latitude && (booking.client as any)?.longitude
                ? `${Number((booking.client as any).latitude).toFixed(4)}, ${Number((booking.client as any).longitude).toFixed(4)}`
                : "No location available"}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            booking.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
          }`}>{booking.status}</span>
        </div>

        {/* Map */}
        <div className="relative">
          <div ref={mapContainer} className="w-full h-[55vh] rounded-2xl overflow-hidden border border-white/30 shadow-sm" />
          {routeLoading && (
            <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
                <span className="text-sm text-gray-600">Calculating route...</span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/30 p-3 flex items-center justify-around">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full bg-[#10B981]" />Your location
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full bg-[#1E3A8A]" />Client location
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-6 h-1 rounded bg-[#10B981]" />Route
          </div>
        </div>

        {/* Open in Maps button */}
        <button onClick={openExternalNav}
          className="w-full bg-[#10B981] text-white py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#0d9668] transition-colors shadow-sm">
          <Navigation className="w-4 h-4" />Open in Mapbox Directions
        </button>
      </div>
    </div>
  );
}
