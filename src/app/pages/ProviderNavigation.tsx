import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, MapPin, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "../../lib/supabase";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const LEASEUS_MAP_STYLE = "mapbox://styles/mapbox/light-v11";

export function ProviderNavigation() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data, error } = await supabase.from("bookings").select(`
          id, title, status, scheduled_at,
          client_id, provider_id,
          client:profiles!client_id(id, full_name, business_lat, business_lng),
          provider:profiles!provider_id(id, full_name, business_lat, business_lng)
        `).eq("id", id).maybeSingle();

        if (error || !data) {
          setError("Could not load booking details.");
          return;
        }

        setBooking(data);
      } catch (err) {
        console.error(err);
        setError("Error loading booking.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  useEffect(() => {
    if (!booking || !mapContainer.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const origin = booking.provider?.business_lng && booking.provider?.business_lat
      ? [booking.provider.business_lng, booking.provider.business_lat]
      : null;
    const destination = booking.client?.business_lng && booking.client?.business_lat
      ? [booking.client.business_lng, booking.client.business_lat]
      : null;

    if (!destination) {
      setError("Client location is missing for navigation.");
      return;
    }

    const center = origin || destination;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: LEASEUS_MAP_STYLE,
      center,
      zoom: 13,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", async () => {
      if (origin) {
        new mapboxgl.Marker({ color: "#10B981" })
          .setLngLat(origin)
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`Provider: ${booking.provider.full_name}`))
          .addTo(map);
      }

      new mapboxgl.Marker({ color: "#1E3A8A" })
        .setLngLat(destination)
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`Client: ${booking.client.full_name}`))
        .addTo(map);

      if (origin) {
        setRouteLoading(true);
        try {
          const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
          const res = await fetch(directionsUrl);
          const json = await res.json();
          const route = json.routes?.[0]?.geometry;

          if (route) {
            if (map.getSource("route")) {
              (map.getSource("route") as any).setData({ type: "Feature", geometry: route });
            } else {
              map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route } });
              map.addLayer({
                id: "route",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#10B981", "line-width": 5, "line-opacity": 0.8 },
              });
            }

            const bounds = new mapboxgl.LngLatBounds(origin as [number, number], origin as [number, number]);
            for (const coord of route.coordinates) {
              bounds.extend(coord as [number, number]);
            }
            bounds.extend(destination as [number, number]);
            map.fitBounds(bounds, { padding: 40 });
          }
        } catch (err) {
          console.error("Directions error", err);
        } finally {
          setRouteLoading(false);
        }
      } else {
        map.flyTo({ center: destination as [number, number], zoom: 13 });
      }
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [booking]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>;
  }

  if (error) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center text-red-600 gap-3">
      <X className="w-8 h-8" />
      <p>{error}</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-[#1E3A8A] text-white rounded-xl">Back</button>
    </div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Navigate to Client</h1>
          <p className="text-sm text-gray-600">Booking: {booking.title}</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-[#1E3A8A] text-sm font-medium">Close</button>
      </div>

      <div className="px-4 pt-3 space-y-3">
        <div className="bg-white/80 rounded-xl border border-white/30 p-3">
          <p className="text-xs text-gray-500">Client</p>
          <p className="text-sm font-semibold text-gray-800">{booking.client.full_name}</p>
          <p className="text-xs text-gray-600">{booking.client.business_lat && booking.client.business_lng ? `Coords: ${booking.client.business_lat.toFixed(5)}, ${booking.client.business_lng.toFixed(5)}` : "No coordinates available"}</p>
        </div>
        <div ref={mapContainer} className="w-full h-[58vh] rounded-2xl overflow-hidden border border-white/30" />
        <button onClick={() => window.open(`https://www.mapbox.com/directions/?destination=${booking.client.business_lat},${booking.client.business_lng}&profile=driving`, "_blank")}
          className="w-full bg-[#10B981] text-white py-3 rounded-xl font-semibold hover:bg-[#0d9668] transition">
          Open Mapbox Directions
        </button>
        {routeLoading && <p className="text-xs text-gray-500 text-center">Loading route...</p>}
      </div>
    </div>
  );
}
