import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bell, Search, Calendar, Home as HomeIcon, Wrench, Car, Scissors,
  Paintbrush, Camera, Laptop, Heart, ChevronRight, MapPin, Star,
  Loader2, TrendingUp, Clock, CheckCircle, Filter,
  GraduationCap, Scale, Calculator, Truck, Bug, Zap, Flower2,
  Dumbbell, ChefHat, PawPrint, Shield, Shirt, MessageCircle,
  BarChart2, Award, Hammer, Package, Eye, EyeOff,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import mintleafLogo from "../../assets/mintleaf-logo.png";
import leaseUsLogo  from "../../assets/logo.png";
import { supabase } from "../../lib/supabase";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const LEASEUS_MAP_STYLE = "mapbox://styles/mapbox/light-v11";
type MapFilter = "all" | "providers" | "partners";

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile]                   = useState<any>(null);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings]   = useState<any[]>([]);
  const [notifications, setNotifications]       = useState(0);
  const [loading, setLoading]                   = useState(true);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<any[]>([]);
  const [nearbyProviders, setNearbyProviders]   = useState<any[]>([]);
  const [mapLoading, setMapLoading]             = useState(true);
  const [mapFilter, setMapFilter]               = useState<MapFilter>("all");
  const [userCoords, setUserCoords]             = useState<[number, number] | null>(null);
  const [providerStats, setProviderStats]       = useState<any>(null);
  const [showStatsDetail, setShowStatsDetail]   = useState(false);

  // ── Hide balance ──────────────────────────────────────────────
  const [balanceHidden, setBalanceHidden] = useState(() => {
    return localStorage.getItem("balanceHidden") === "true";
  });
  const toggleBalance = () => {
    setBalanceHidden(prev => {
      localStorage.setItem("balanceHidden", String(!prev));
      return !prev;
    });
  };
  const mask = "••••••";

  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<mapboxgl.Marker[]>([]);
  const pulseRef     = useRef<mapboxgl.Marker | null>(null);

  const categories = [
    { icon: HomeIcon,      label: "Cleaning",          color: "bg-blue-100 text-blue-600" },
    { icon: Wrench,        label: "Plumbing",           color: "bg-green-100 text-green-600" },
    { icon: Car,           label: "Car Wash",           color: "bg-purple-100 text-purple-600" },
    { icon: Scissors,      label: "Hair & Beauty",      color: "bg-pink-100 text-pink-600" },
    { icon: Paintbrush,    label: "Painting",           color: "bg-orange-100 text-orange-600" },
    { icon: Camera,        label: "Photography",        color: "bg-indigo-100 text-indigo-600" },
    { icon: Laptop,        label: "IT Services",        color: "bg-cyan-100 text-cyan-600" },
    { icon: Heart,         label: "Healthcare",         color: "bg-red-100 text-red-600" },
    { icon: GraduationCap, label: "Tutoring",           color: "bg-yellow-100 text-yellow-600" },
    { icon: Scale,         label: "Legal",              color: "bg-slate-100 text-slate-600" },
    { icon: Calculator,    label: "Accounting",         color: "bg-emerald-100 text-emerald-600" },
    { icon: Truck,         label: "Moving",             color: "bg-amber-100 text-amber-600" },
    { icon: Bug,           label: "Pest Control",       color: "bg-lime-100 text-lime-600" },
    { icon: Zap,           label: "Electrical",         color: "bg-yellow-100 text-yellow-700" },
    { icon: Flower2,       label: "Gardening",          color: "bg-green-100 text-green-700" },
    { icon: Dumbbell,      label: "Personal Training",  color: "bg-rose-100 text-rose-600" },
    { icon: ChefHat,       label: "Catering",           color: "bg-orange-100 text-orange-700" },
    { icon: PawPrint,      label: "Pet Care",           color: "bg-amber-100 text-amber-700" },
    { icon: Shield,        label: "Security",           color: "bg-gray-100 text-gray-700" },
    { icon: Shirt,         label: "Laundry",            color: "bg-sky-100 text-sky-600" },
    { icon: Hammer,        label: "Repairs",            color: "bg-stone-100 text-stone-600" },
  ];

  const mockServices = [
    { id: "1", title: "Professional Cleaning",  provider_name: "CleanPro Services", avg_rating: 4.9, price_pence: 5000, price_type: "hourly", accepts_leus: true,  image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop" },
    { id: "2", title: "Emergency Plumbing",     provider_name: "QuickFix Plumbers", avg_rating: 4.8, price_pence: 7500, price_type: "hourly", accepts_leus: true,  image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop" },
    { id: "3", title: "Mobile Car Detailing",   provider_name: "Shine & Drive",     avg_rating: 4.7, price_pence: 4000, price_type: "fixed",  accepts_leus: false, image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop" },
  ];

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (loading) return;
    const isProvider = profile?.role === "provider" || profile?.role === "local_business";
    if (isProvider) return;
    if (map.current) return;
    initMap();
    return () => { map.current?.remove(); map.current = null; };
  }, [loading]);

  useEffect(() => {
    if (!map.current) return;
    renderMarkers();
  }, [mapFilter, nearbyBusinesses, nearbyProviders]);

  const fetchProviderStats = async (userId: string) => {
    try {
      const { data: bookings } = await supabase.from("bookings")
        .select("id, status, amount_pence, amount_leus, payment_method, created_at")
        .eq("provider_id", userId);

      const total     = bookings?.length || 0;
      const completed = bookings?.filter(b => b.status === "completed") || [];
      const pending   = bookings?.filter(b => b.status === "pending").length || 0;
      const cancelled = bookings?.filter(b => b.status === "cancelled").length || 0;

      const totalEarned = completed.reduce((sum: number, b: any) =>
        sum + (b.payment_method === "fiat" ? (b.amount_pence || 0) / 100 : Number(b.amount_leus || 0)), 0);

      const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
      const monthBookings = bookings?.filter(b => new Date(b.created_at) >= thisMonth) || [];
      const monthEarned   = monthBookings.filter(b => b.status === "completed").reduce((sum: number, b: any) =>
        sum + (b.payment_method === "fiat" ? (b.amount_pence || 0) / 100 : Number(b.amount_leus || 0)), 0);

      const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

      const { data: reviews } = await supabase.from("reviews")
        .select("rating, created_at").eq("reviewee_id", userId).order("created_at", { ascending: false }).limit(5);

      setProviderStats({ total, completed: completed.length, pending, cancelled, totalEarned, monthEarned, completionRate, recentReviews: reviews || [] });
    } catch (err) { console.error(err); }
  };

  const initMap = () => {
    if (!navigator.geolocation) { setupMap(-0.1276, 51.5074); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setupMap(coords.longitude, coords.latitude);
        navigator.geolocation.watchPosition(
          ({ coords: updated }) => {
            if (!pulseRef.current) return;
            pulseRef.current.setLngLat([updated.longitude, updated.latitude]);
            setUserCoords([updated.longitude, updated.latitude]);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      },
      () => { setupMap(-0.1276, 51.5074); setMapLoading(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  const setupMap = async (lng: number, lat: number) => {
    if (!mapContainer.current) return;
    setUserCoords([lng, lat]);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: LEASEUS_MAP_STYLE,
      center: [lng, lat],
      zoom: 14,
      attributionControl: false,
    });

    map.current.on("load", () => {
      const m = map.current!;
      ["road-primary","road-secondary-tertiary","road-street","road-minor"].forEach(layer => {
        if (m.getLayer(layer)) { m.setPaintProperty(layer, "line-color", "#1E3A8A"); m.setPaintProperty(layer, "line-opacity", 0.15); }
      });
      ["water","water-shadow"].forEach(layer => { if (m.getLayer(layer)) m.setPaintProperty(layer, "fill-color", "#d1fae5"); });
      ["landuse","national-park","landuse-park"].forEach(layer => { if (m.getLayer(layer)) m.setPaintProperty(layer, "fill-color", "#ecfdf5"); });
      if (m.getLayer("building")) { m.setPaintProperty("building", "fill-color", "#e8eef7"); m.setPaintProperty("building", "fill-opacity", 0.6); }
      if (m.getLayer("background")) m.setPaintProperty("background", "background-color", "#f8fafc");
    });

    const pulseEl = document.createElement("div");
    pulseEl.innerHTML = `
      <div style="position:relative;width:20px;height:20px">
        <div style="position:absolute;inset:0;border-radius:50%;background:#1E3A8A;opacity:0.25;animation:pulse-ring 1.8s ease-out infinite;"></div>
        <div style="position:absolute;inset:3px;border-radius:50%;background:#1E3A8A;border:2px solid white;box-shadow:0 2px 8px rgba(30,58,138,0.5);"></div>
      </div>
      <style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.25}70%{transform:scale(2.8);opacity:0}100%{transform:scale(2.8);opacity:0}}</style>
    `;
    pulseRef.current = new mapboxgl.Marker({ element: pulseEl, anchor: "center" })
      .setLngLat([lng, lat]).setPopup(new mapboxgl.Popup({ offset: 20 }).setText("You are here")).addTo(map.current);

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    try {
      const [bizResult, providerResult] = await Promise.all([
        supabase.from("profiles").select("id, business_name, business_category, business_lat, business_lng").eq("is_local_partner", true).eq("accepts_leus", true),
        supabase.from("profiles").select("id, full_name, business_category, avg_rating, business_lat, business_lng").eq("role", "provider").not("business_lat", "is", null),
      ]);
      setNearbyBusinesses(bizResult.data || []);
      setNearbyProviders(providerResult.data || []);
    } catch (err) { console.error(err); }
    finally { setMapLoading(false); }
  };

  const renderMarkers = () => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (mapFilter === "all" || mapFilter === "partners") {
      nearbyBusinesses.forEach((biz: any) => {
        const lat = biz.business_lat; const lng = biz.business_lng;
        if (!lat || !lng) return;
        const el = document.createElement("div");
        el.style.cssText = "width:38px;height:38px;border-radius:50%;background:#1E3A8A;border:2.5px solid #10B981;box-shadow:0 2px 10px rgba(30,58,138,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;transition:transform 0.15s;";
        el.onmouseenter = () => { el.style.transform = "scale(1.15)"; };
        el.onmouseleave = () => { el.style.transform = "scale(1)"; };
        const img = document.createElement("img");
        img.src = leaseUsLogo; img.style.cssText = "width:26px;height:26px;object-fit:contain;";
        el.appendChild(img);
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 22 }).setHTML(`<div style="font-family:sans-serif;padding:6px 8px;min-width:140px"><div style="font-weight:600;color:#1E3A8A;font-size:13px">${biz.business_name || biz.full_name}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">${biz.business_category || "Local business"}</div><div style="font-size:11px;color:#10B981;font-weight:600;margin-top:4px">✓ Accepts LEUS</div></div>`))
          .addTo(map.current!);
        markersRef.current.push(marker);
      });
    }

    if (mapFilter === "all" || mapFilter === "providers") {
      nearbyProviders.forEach((provider: any) => {
        const lng = provider.business_lng; const lat = provider.business_lat;
        if (!lat || !lng) return;
        const el = document.createElement("div");
        el.style.cssText = "width:34px;height:34px;border-radius:50%;background:#10B981;border:2.5px solid white;box-shadow:0 2px 10px rgba(16,185,129,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.15s;";
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
        el.onmouseenter = () => { el.style.transform = "scale(1.15)"; };
        el.onmouseleave = () => { el.style.transform = "scale(1)"; };
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 22 }).setHTML(`<div style="font-family:sans-serif;padding:6px 8px;min-width:140px"><div style="font-weight:600;color:#1E3A8A;font-size:13px">${provider.full_name}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">${provider.business_category || "Service Provider"}</div>${provider.avg_rating ? `<div style="font-size:11px;color:#f59e0b;margin-top:4px">★ ${Number(provider.avg_rating).toFixed(1)}</div>` : ""}</div>`))
          .addTo(map.current!);
        markersRef.current.push(marker);
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications(count || 0);

      const isProvider = profileData?.role === "provider" || profileData?.role === "local_business";

      if (isProvider) {
        const { data: bookingData } = await supabase.from("bookings")
          .select("id, title, scheduled_at, payment_method, amount_pence, amount_leus, client:profiles!client_id(full_name)")
          .eq("provider_id", user.id).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(3);
        setPendingBookings(bookingData || []);
        await fetchProviderStats(user.id);
      } else {
        const { data: listingsData } = await supabase.from("listings")
          .select(`id, title, price_pence, price_type, accepts_leus, profiles!provider_id(full_name, avg_rating), listing_images(url, is_primary)`)
          .eq("status", "active").limit(3);
        if (listingsData && listingsData.length > 0) {
          setFeaturedServices(listingsData.map((item: any) => ({
            id: item.id, title: item.title,
            provider_name: item.profiles?.full_name || "Unknown",
            avg_rating: item.profiles?.avg_rating || 0,
            price_pence: item.price_pence, price_type: item.price_type,
            accepts_leus: item.accepts_leus,
            image: item.listing_images?.find((img: any) => img.is_primary)?.url || item.listing_images?.[0]?.url || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
          })));
        } else { setFeaturedServices(mockServices); }
      }
    } catch (err) { setFeaturedServices(mockServices); }
    finally { setLoading(false); }
  };

  const formatPrice = (pence: number, type: string) => `£${pence / 100}${type === "hourly" ? "/hr" : ""}`;
  const totalPortfolio = profile ? profile.fiat_balance_pence / 100 + Number(profile.leus_balance) : 0;
  const vestingPct     = profile ? Math.round((Number(profile.signup_bonus_vested) / Number(profile.signup_bonus_total || 50)) * 100) : 0;
  const firstName      = profile?.full_name?.split(" ")[0] || "there";
  const isProvider     = profile?.role === "provider" || profile?.role === "local_business";

  const handleSelectNearby = (item: any) => {
    if (item.lat && item.lng && map.current) {
      map.current.flyTo({ center: [item.lng, item.lat], zoom: 15 });
      if (item.type === "provider") {
        // optional: route to the provider detail page if exists
        // navigate(`/home/service/${item.id}`);
      } else {
        // optional: route to partner info page
        // navigate(`/home/partners/${item.id}`);
      }
    }
  };

  const filteredList = mapFilter === "providers"
    ? nearbyProviders.slice(0, 3).map((p: any) => ({ id: p.id, name: p.full_name, category: p.business_category || "Service Provider", type: "provider", rating: p.avg_rating, lat: p.business_lat, lng: p.business_lng }))
    : mapFilter === "partners"
    ? nearbyBusinesses.slice(0, 3).map((b: any) => ({ id: b.id, name: b.business_name || b.full_name, category: b.business_category || "Local business", type: "partner", lat: b.business_lat, lng: b.business_lng }))
    : [
        ...nearbyProviders.slice(0, 2).map((p: any) => ({ id: p.id, name: p.full_name, category: p.business_category || "Service Provider", type: "provider", rating: p.avg_rating, lat: p.business_lat, lng: p.business_lng })),
        ...nearbyBusinesses.slice(0, 2).map((b: any) => ({ id: b.id, name: b.business_name || b.full_name, category: b.business_category || "Local business", type: "partner", lat: b.business_lat, lng: b.business_lng })),
      ].slice(0, 4);

  return (
    <div className="min-h-screen">

      {/* ── Header ── */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
              <span className="text-white">Lease</span><span className="text-[#10B981]">Us</span>
            </h1>
            {!loading && (
              <p className="text-white mt-1 text-lg font-semibold" style={{ fontFamily: "Poppins, sans-serif" }}>
                Hey, {firstName} 👋
                {isProvider && <span className="ml-2 bg-[#10B981]/30 px-2 py-0.5 rounded-full text-[#10B981] text-sm">Provider</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Hide/Show balance toggle */}
            <button onClick={toggleBalance}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              title={balanceHidden ? "Show balances" : "Hide balances"}>
              {balanceHidden
                ? <EyeOff className="w-5 h-5 text-white" />
                : <Eye className="w-5 h-5 text-white" />}
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-white" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full text-xs text-white flex items-center justify-center">
                  {notifications > 9 ? "9+" : notifications}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Wallet summary */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
          {loading ? (
            <div className="flex items-center justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>
          ) : (
            <>
              <p className="text-white/80 text-sm mb-1">{isProvider ? "Total Earnings & Balance" : "Total Portfolio Value"}</p>
              <h2 className="text-white text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
                {balanceHidden ? <span className="tracking-widest">£{mask}</span> : `£${totalPortfolio.toFixed(2)}`}
              </h2>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div>
                  <span className="text-white/70">GBP: </span>
                  <span className="text-white font-semibold">
                    {balanceHidden ? mask : `£${((profile?.fiat_balance_pence || 0) / 100).toFixed(2)}`}
                  </span>
                </div>
                <div>
                  <span className="text-white/70">LEUS: </span>
                  <span className="text-white font-semibold">
                    {balanceHidden ? mask : <><span className="leus">ᛃ</span>{Number(profile?.leus_balance || 0).toFixed(2)}</>}
                  </span>
                </div>
                {isProvider && (
                  <div>
                    <span className="text-white/70">Rating: </span>
                    <span className="text-white font-semibold">★ {Number(profile?.avg_rating || 0).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── PROVIDER VIEW ── */}
      {isProvider && !loading && (
        <>
          <div className="px-4 mt-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { to: "/home/bookings", Icon: Calendar,      bg: "bg-green-100",  color: "text-[#10B981]",  label: "Requests" },
                { to: "/home/services", Icon: Package,       bg: "bg-blue-100",   color: "text-[#1E3A8A]",  label: "My Listings" },
                { to: "/home/wallet",   Icon: TrendingUp,    bg: "bg-purple-100", color: "text-purple-600", label: "Earnings" },
                { to: "/home/messages", Icon: MessageCircle, bg: "bg-cyan-100",   color: "text-cyan-600",   label: "Messages" },
                { to: "/home/loyalty",  Icon: Award,         bg: "bg-yellow-100", color: "text-yellow-500", label: "Loyalty" },
              ].map(({ to, Icon, bg, color, label }) => (
                <Link key={to} to={to} className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30">
                  <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <span className="text-xs text-center text-gray-700">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Performance */}
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg text-[#1E3A8A]">Your Performance</h3>
              <button onClick={() => setShowStatsDetail(!showStatsDetail)}
                className="text-sm text-[#10B981] flex items-center gap-1">
                {showStatsDetail ? "Hide" : "Details"} <ChevronRight className={`w-4 h-4 transition-transform ${showStatsDetail ? "rotate-90" : ""}`} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Rating",     value: Number(profile?.avg_rating || 0).toFixed(1), Icon: Star,         color: "text-yellow-500", bg: "bg-yellow-50",  to: "/home/profile" },
                { label: "Reviews",    value: profile?.total_reviews || 0,                 Icon: MessageCircle, color: "text-blue-600",  bg: "bg-blue-50",    to: "/home/profile" },
                { label: "Completion", value: `${providerStats?.completionRate || 0}%`,    Icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50",   to: "/home/bookings" },
              ].map(({ label, value, Icon, color, bg, to }) => (
                <Link key={label} to={to} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30 text-center hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 ${bg} rounded-full flex items-center justify-center mx-auto mb-2`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-lg font-bold text-[#1E3A8A]">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </Link>
              ))}
            </div>

            {showStatsDetail && providerStats && (
              <div className="mt-3 bg-white/80 backdrop-blur-md rounded-xl p-4 border border-white/30 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#1E3A8A]" />Booking Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Bookings", value: providerStats.total,   color: "text-gray-800" },
                    { label: "Completed",       value: providerStats.completed, color: "text-green-600" },
                    { label: "Pending",         value: providerStats.pending, color: "text-yellow-600" },
                    { label: "Cancelled",       value: providerStats.cancelled, color: "text-red-500" },
                    { label: "Total Earned",    value: balanceHidden ? mask : `£${providerStats.totalEarned.toFixed(2)}`, color: "text-[#1E3A8A]" },
                    { label: "This Month",      value: balanceHidden ? mask : `£${providerStats.monthEarned.toFixed(2)}`, color: "text-[#10B981]" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Completion rate</span>
                    <span className="font-medium text-[#1E3A8A]">{providerStats.completionRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1E3A8A] to-[#10B981] rounded-full transition-all" style={{ width: `${providerStats.completionRate}%` }} />
                  </div>
                </div>
                {providerStats.recentReviews.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Recent reviews</p>
                    <div className="flex gap-1">
                      {providerStats.recentReviews.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-0.5 bg-yellow-50 px-2 py-1 rounded-lg">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium text-yellow-700">{r.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Link to="/home/bookings" className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm hover:bg-[#152d6b] transition-colors">
                  <Calendar className="w-4 h-4" />View All Bookings
                </Link>
              </div>
            )}
          </div>

          {/* Pending requests */}
          <div className="px-4 mt-6 pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg text-[#1E3A8A]">Pending Requests</h3>
              <Link to="/home/bookings" className="text-sm text-[#10B981] flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            {pendingBookings.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 text-center border border-white/30">
                <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((booking: any) => (
                  <div key={booking.id} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">{booking.title}</h4>
                        <p className="text-xs text-gray-500">{booking.client?.full_name || "Unknown client"}</p>
                      </div>
                      <span className="text-sm font-semibold text-[#1E3A8A]">
                        {balanceHidden ? mask : booking.payment_method === "fiat" ? `£${(booking.amount_pence / 100).toFixed(2)}` : `ᛃ${booking.amount_leus}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <Clock className="w-3 h-3" />
                      {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "TBD"}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate("/home/bookings")} className="flex-1 bg-[#10B981] text-white py-2 rounded-lg text-sm hover:bg-[#0d9668] transition-colors">Accept</button>
                      <button onClick={() => navigate("/home/bookings")} className="flex-1 border border-red-300 text-red-500 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CLIENT VIEW ── */}
      {!isProvider && (
        <>
          {/* Vesting banner */}
          {!loading && (
            <div className="mx-4 mt-4 bg-gradient-to-r from-[#10B981]/90 to-[#14B8A6]/90 backdrop-blur-md rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm opacity-90">Your LEUS Bonus</p>
                  <h3 className="text-2xl font-bold">
                    {balanceHidden ? mask : `${Number(profile?.signup_bonus_vested || 0).toFixed(1)} / ${Number(profile?.signup_bonus_total || 50).toFixed(0)} LEUS`}
                  </h3>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                    <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="6" fill="none" strokeDasharray={`${vestingPct * 1.76} 176`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm">{vestingPct}%</span></div>
                </div>
              </div>
              <p className="text-xs opacity-80">Keep using LeaseUs to unlock your remaining bonus!</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="px-4 mt-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { to: "/home/services", Icon: Search,   label: "Find Services", color: "text-[#1E3A8A]", bg: "bg-blue-100" },
                { to: "/home/bookings", Icon: Calendar, label: "My Bookings",   color: "text-[#10B981]", bg: "bg-green-100" },
                { to: "/home/mintleaf", Icon: null,      label: "MintLeaf",      color: "",               bg: "" },
                { to: "/home/loyalty",  Icon: Award,    label: "Loyalty",       color: "text-yellow-500", bg: "bg-yellow-100" },
              ].map(({ to, Icon, label, color, bg }) => (
                <Link key={to} to={to} className="flex-shrink-0 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 min-w-[100px] border border-white/30">
                  {Icon
                    ? <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
                    : <img src={mintleafLogo} alt="MintLeaf" className="w-10 h-10 object-contain" />}
                  <span className="text-xs text-center text-gray-700">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="px-4 mt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search for services..." onFocus={() => navigate("/home/services")}
                className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-md rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 mt-6">
            <h3 className="text-lg mb-3 text-[#1E3A8A]">Browse Categories</h3>
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex flex-wrap gap-3" style={{ width: "max-content" }}>
                {categories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <Link key={index} to="/home/services"
                      className="bg-white/80 backdrop-blur-md rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 border border-white/30 hover:shadow-md transition-shadow"
                      style={{ width: "80px" }}>
                      <div className={`w-11 h-11 rounded-full ${category.color} flex items-center justify-center`}><Icon className="w-5 h-5" /></div>
                      <span className="text-xs text-center text-gray-700 leading-tight">{category.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Featured services */}
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg text-[#1E3A8A]">Featured Services</h3>
              <Link to="/home/services" className="text-sm text-[#10B981] flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-3">
              {featuredServices.map((service) => (
                <Link key={service.id} to={`/home/service/${service.id}`}
                  className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden border border-white/30 flex gap-3">
                  <img src={service.image} alt={service.title} className="w-24 h-24 object-cover" />
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm text-gray-800">{service.title}</h4>
                      {service.accepts_leus && <span className="bg-[#10B981] text-white text-xs px-2 py-0.5 rounded-full">LEUS</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{service.provider_name}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">{service.avg_rating > 0 ? service.avg_rating.toFixed(1) : "New"}</span>
                      </div>
                      <span className="text-sm text-[#1E3A8A]">{service.price_pence ? formatPrice(service.price_pence, service.price_type) : "Quote"}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="px-4 mt-6 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg text-[#1E3A8A]">Near You</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Filter className="w-3 h-3" />
                <span>{nearbyProviders.length + nearbyBusinesses.length} nearby</span>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {[
                { key: "all",       label: "All" },
                { key: "providers", label: `Providers (${nearbyProviders.length})` },
                { key: "partners",  label: `LEUS Partners (${nearbyBusinesses.length})` },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setMapFilter(key as MapFilter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mapFilter === key ? "bg-[#1E3A8A] text-white" : "bg-white/80 text-gray-600 border border-white/30"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/30 shadow-sm" style={{ height: "240px" }}>
              <div ref={mapContainer} className="w-full h-full" />
              {mapLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                </div>
              )}
              {!mapLoading && (
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm flex gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#1E3A8A] border border-[#10B981]" /><span className="text-xs text-gray-600">LEUS Partner</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#10B981]" /><span className="text-xs text-gray-600">Provider</span></div>
                </div>
              )}
              {!mapLoading && userCoords && (
                <button onClick={() => map.current?.flyTo({ center: userCoords, zoom: 14 })}
                  className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-sm border border-white/30">
                  <MapPin className="w-4 h-4 text-[#1E3A8A]" />
                </button>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {filteredList.length === 0 && !mapLoading ? (
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 text-center border border-white/30">
                  <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">{mapFilter === "providers" ? "No providers nearby yet" : mapFilter === "partners" ? "No LEUS partners nearby yet" : "Nothing nearby yet"}</p>
                </div>
              ) : filteredList.map((item: any) => (
                <button key={item.id} onClick={() => handleSelectNearby(item)}
                  className={`w-full text-left bg-white/80 backdrop-blur-md rounded-xl p-3 flex items-center justify-between border border-white/30 shadow-sm transition hover:bg-[#eef5ff]`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === "provider" ? "bg-[#10B981]/10" : "bg-[#1E3A8A]/10"}`}>
                      {item.type === "provider" ? <Wrench className="w-5 h-5 text-[#10B981]" /> : <MapPin className="w-5 h-5 text-[#1E3A8A]" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                      <p className="text-xs text-gray-500">{item.lat && item.lng ? `(${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})` : "Location data unavailable"}</p>
                    </div>
                  </div>
                  {item.type === "partner"
                    ? <span className="bg-[#10B981] text-white text-xs px-2 py-1 rounded-full">LEUS</span>
                    : <span className="bg-[#1E3A8A] text-white text-xs px-2 py-1 rounded-full">{item.rating ? `★ ${Number(item.rating).toFixed(1)}` : "Provider"}</span>
                  }
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}