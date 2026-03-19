import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Star, MapPin, ChevronRight, Loader2, Plus, Edit2, Trash2, Eye, EyeOff, Camera, X, ChevronDown, DollarSign, CheckCircle, BarChart2, TrendingUp, Users, Package } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useRef } from "react";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
interface Listing {
  id: string;
  title: string;
  description: string;
  price_pence: number | null;
  price_leus: number | null;
  price_type: string;
  accepts_leus: boolean;
  accepts_fiat: boolean;
  location_city: string | null;
  is_remote: boolean;
  avg_rating: number;
  total_reviews: number;
  primary_image: string | null;
  provider_name: string;
  category_name: string | null;
  status?: string;
  listing_images?: any[];
}

type Tab = "listings" | "analytics" | "add";

const CATEGORIES = [
  "Cleaning","Plumbing","Car Wash","Hair & Beauty","Painting",
  "Photography","IT Services","Healthcare","Tutoring / Education",
  "Legal Services","Accounting / Finance","Moving / Removals",
  "Pest Control","Electrical","Gardening / Landscaping",
  "Personal Training","Catering / Events","Pet Care / Grooming",
  "Security Services","Laundry / Ironing","Other",
];

const mockListings: Listing[] = [
  { id:"1", title:"Professional Cleaning",  provider_name:"CleanPro Services", avg_rating:4.9, total_reviews:156, price_pence:5000, price_leus:null, price_type:"hourly", location_city:"London", accepts_leus:true,  accepts_fiat:true, is_remote:false, primary_image:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop", category_name:"Cleaning",   description:"" },
  { id:"2", title:"Emergency Plumbing",     provider_name:"QuickFix Plumbers", avg_rating:4.8, total_reviews:203, price_pence:7500, price_leus:null, price_type:"hourly", location_city:"London", accepts_leus:true,  accepts_fiat:true, is_remote:false, primary_image:"https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop", category_name:"Plumbing",   description:"" },
  { id:"3", title:"Mobile Car Detailing",   provider_name:"Shine & Drive",     avg_rating:4.7, total_reviews:89,  price_pence:4000, price_leus:null, price_type:"fixed",  location_city:"London", accepts_leus:false, accepts_fiat:true, is_remote:false, primary_image:"https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop", category_name:"Car Care",   description:"" },
  { id:"4", title:"Hair Styling",           provider_name:"Style Studio",      avg_rating:4.9, total_reviews:312, price_pence:3500, price_leus:null, price_type:"fixed",  location_city:"London", accepts_leus:true,  accepts_fiat:true, is_remote:false, primary_image:"https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop", category_name:"Beauty",     description:"" },
];

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT — role-aware
// ─────────────────────────────────────────────────────────────────
export function Services() {
  const [role, setRole]       = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => { setRole(data?.role || "client"); setRoleLoading(false); });
    });
  }, []);

  if (roleLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
    </div>
  );

  if (role === "provider" || role === "local_business") return <ProviderServicesView />;
  return <ClientServicesView />;
}

// ─────────────────────────────────────────────────────────────────
// CLIENT VIEW — browse services
// ─────────────────────────────────────────────────────────────────
function ClientServicesView() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [leusOnly, setLeusOnly]       = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings]       = useState<Listing[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { fetchListings(); }, [leusOnly, searchQuery]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("listings")
        .select(`id, title, description, price_pence, price_leus, price_type, accepts_leus, accepts_fiat, location_city, is_remote, profiles!provider_id(full_name, avg_rating, total_reviews), categories(name), listing_images(url, is_primary)`)
        .eq("status", "active");
      if (leusOnly) query = query.eq("accepts_leus", true);
      if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);
      const { data } = await query.limit(20);
      if (data && data.length > 0) {
        setListings(data.map((item: any) => ({
          id: item.id, title: item.title, description: item.description,
          price_pence: item.price_pence, price_leus: item.price_leus,
          price_type: item.price_type, accepts_leus: item.accepts_leus,
          accepts_fiat: item.accepts_fiat, location_city: item.location_city,
          is_remote: item.is_remote,
          avg_rating: item.profiles?.avg_rating || 0,
          total_reviews: item.profiles?.total_reviews || 0,
          provider_name: item.profiles?.full_name || "Unknown Provider",
          category_name: item.categories?.name || null,
          primary_image: item.listing_images?.find((img: any) => img.is_primary)?.url || item.listing_images?.[0]?.url || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
        })));
      } else {
        setListings(leusOnly ? mockListings.filter(l => l.accepts_leus) : mockListings);
      }
    } catch {
      setListings(leusOnly ? mockListings.filter(l => l.accepts_leus) : mockListings);
    } finally { setLoading(false); }
  };

  const formatPrice = (l: Listing) => {
    if (l.price_pence) return `£${l.price_pence / 100}${l.price_type === "hourly" ? "/hr" : ""}`;
    if (l.price_leus) return `<span className="leus">ᛃ</span>${l.price_leus}`;
    return "Quote";
  };

  return (
    <div className="min-h-screen">
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-4">Find Services</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for services..."
            className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-md rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] border border-white/30" />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => setShowFilters(!showFilters)}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-white/30">
            <SlidersHorizontal className="w-4 h-4" />Filters
          </button>
          <button onClick={() => setLeusOnly(!leusOnly)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${leusOnly ? "bg-[#10B981] text-white" : "bg-white/20 backdrop-blur-sm text-white border border-white/30"}`}>
            LEUS Only
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-sm text-gray-600">{loading ? "Loading..." : `${listings.length} services available`}</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
        </div>
      ) : (
        <div className="px-4 space-y-4 pb-6">
          {listings.map(service => (
            <div key={service.id}
              className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-white/30">
              <div className="relative">
                <img src={service.primary_image || ""} alt={service.title} className="w-full h-48 object-cover" />
                {service.accepts_leus && (
                  <span className="absolute top-3 right-3 bg-[#10B981] text-white text-xs px-3 py-1 rounded-full">LEUS Accepted</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-base text-gray-800 mb-1">{service.title}</h3>
                    <p className="text-sm text-gray-500">{service.provider_name}</p>
                  </div>
                  <p className="text-lg text-[#1E3A8A]">{formatPrice(service)}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{service.avg_rating > 0 ? service.avg_rating.toFixed(1) : "New"}</span>
                    {service.total_reviews > 0 && <span className="text-gray-400">({service.total_reviews})</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{service.is_remote ? "Remote" : service.location_city || "UK"}</span>
                  </div>
                </div>
                <button onClick={() => navigate(`/home/service/${service.id}`)}
                  className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-lg hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2">
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROVIDER VIEW — manage listings + analytics
// ─────────────────────────────────────────────────────────────────
function ProviderServicesView() {
  const navigate                  = useNavigate();
  const [profile, setProfile]     = useState<any>(null);
  const [listings, setListings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("listings");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title:"", description:"", category:"",
    price_pence:"", price_type:"fixed",
    accepts_leus:true, status:"active",
  });
  const [images, setImages]             = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);
      const { data: listingsData } = await supabase
        .from("listings").select("*, listing_images(url, is_primary)")
        .eq("provider_id", user.id).order("created_at", { ascending: false });
      setListings(listingsData || []);
      await fetchAnalytics(user.id, listingsData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAnalytics = async (userId: string, currentListings: any[]) => {
    try {
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: bookings } = await supabase.from("bookings")
        .select("id, amount_pence, amount_leus, payment_method, status, created_at")
        .eq("provider_id", userId).gte("created_at", sevenDaysAgo.toISOString());
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return { day: d.toLocaleDateString("en-GB", { weekday: "short" }), date: d.toISOString().split("T")[0], earnings: 0, bookings: 0 };
      });
      bookings?.forEach(b => {
        const day = days.find(d => d.date === b.created_at.split("T")[0]);
        if (day && b.status === "completed") {
          day.earnings += b.payment_method === "fiat" ? (b.amount_pence || 0) / 100 : Number(b.amount_leus || 0);
          day.bookings += 1;
        }
      });
      const { data: allBookings } = await supabase.from("bookings").select("id, amount_pence, amount_leus, payment_method, status").eq("provider_id", userId);
      const completed   = allBookings?.filter(b => b.status === "completed") || [];
      const totalEarned = completed.reduce((s, b) => s + (b.payment_method === "fiat" ? (b.amount_pence || 0) / 100 : Number(b.amount_leus || 0)), 0);
      setAnalytics({ chartData: days, totalBookings: allBookings?.length || 0, completedBookings: completed.length, totalEarned, activeListings: currentListings.filter(l => l.status === "active").length });
    } catch { /* silent */ }
  };

  const resetForm = () => {
    setForm({ title:"", description:"", category:"", price_pence:"", price_type:"fixed", accepts_leus:true, status:"active" });
    setImages([]); setImagePreviews([]); setEditingId(null); setError("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) { setError("Maximum 5 images."); return; }
    setImages(p => [...p, ...files]);
    setImagePreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleSave = async () => {
    if (!form.title || !form.category || !form.price_pence) { setError("Please fill in all required fields."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const listingData = { provider_id: user.id, title: form.title, description: form.description, category: form.category, price_pence: Math.round(parseFloat(form.price_pence) * 100), price_type: form.price_type, accepts_leus: form.accepts_leus, status: form.status };
      let listingId = editingId;
      if (editingId) {
        const { error: updateErr } = await supabase.from("listings").update(listingData).eq("id", editingId);
        if (updateErr) throw updateErr;
      } else {
        const { data, error: insertErr } = await supabase.from("listings").insert(listingData).select("id").single();
        if (insertErr) throw insertErr;
        if (!data) throw new Error("Failed to create listing. Check Supabase RLS policies on the listings table.");
        listingId = data.id;
      }
      for (let i = 0; i < images.length; i++) {
        const file = images[i]; const ext = file.name.split(".").pop();
        const path = `listings/${listingId}/${Date.now()}_${i}.${ext}`;
        await supabase.storage.from("listing-images").upload(path, file, { upsert: true });
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
        await supabase.from("listing_images").insert({ listing_id: listingId, url: urlData.publicUrl, is_primary: i === 0 && !editingId });
      }
      setSuccess(editingId ? "Listing updated!" : "Listing created!");
      resetForm(); setActiveTab("listings"); fetchData();
    } catch (err: any) { setError(err.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleEdit = (listing: any) => {
    setForm({ title: listing.title, description: listing.description || "", category: listing.category || "", price_pence: String((listing.price_pence || 0) / 100), price_type: listing.price_type || "fixed", accepts_leus: listing.accepts_leus, status: listing.status });
    setEditingId(listing.id); setImages([]); setImagePreviews([]); setActiveTab("add");
  };

  const handleToggleStatus = async (listing: any) => {
    await supabase.from("listings").update({ status: listing.status === "active" ? "inactive" : "active" }).eq("id", listing.id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    fetchData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily:"Syne, sans-serif" }}>My Services</h1>
            <p className="text-white/70 text-sm">{listings.length} listing{listings.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => { resetForm(); setActiveTab("add"); }}
            className="bg-[#10B981] text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />Add Listing
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:"Active",  value: listings.filter(l => l.status === "active").length, icon:"✅" },
            { label:"Rating",  value: Number(profile?.avg_rating || 0).toFixed(1),        icon:"⭐" },
            { label:"Reviews", value: profile?.total_reviews || 0,                        icon:"💬" },
          ].map((s, i) => (
            <div key={i} className="bg-white/20 rounded-xl p-2 text-center">
              <p className="text-white font-bold">{s.value}</p>
              <p className="text-white/70 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex bg-white/80 backdrop-blur-md rounded-xl p-1 border border-white/30">
          {([
            { key:"listings",  label:"My Listings", Icon: Package },
            { key:"analytics", label:"Analytics",   Icon: BarChart2 },
            { key:"add",       label: editingId ? "Edit" : "Add New", Icon: Plus },
          ] as {key:Tab; label:string; Icon:any}[]).map(({ key, label, Icon }) => (
            <button key={key}
              onClick={() => { if (key !== "add") setActiveTab(key); else { resetForm(); setActiveTab("add"); } }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === key ? "bg-[#1E3A8A] text-white" : "text-gray-600"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {success && <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}

      {/* ── LISTINGS TAB ── */}
      {activeTab === "listings" && (
        <div className="px-4 mt-4 pb-6 space-y-3">
          {listings.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-10 text-center border border-white/30">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No listings yet</p>
              <button onClick={() => setActiveTab("add")} className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-sm">Create Your First Listing</button>
            </div>
          ) : listings.map(listing => {
            const img = listing.listing_images?.find((i: any) => i.is_primary)?.url || listing.listing_images?.[0]?.url;
            return (
              <div key={listing.id} className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/30 overflow-hidden">
                <div className="flex gap-3">
                  {img
                    ? <img src={img} alt={listing.title} className="w-24 h-24 object-cover flex-shrink-0" />
                    : <div className="w-24 h-24 bg-gray-100 flex items-center justify-center flex-shrink-0"><Camera className="w-8 h-8 text-gray-300" /></div>
                  }
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-800 flex-1">{listing.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${listing.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{listing.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{listing.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1E3A8A]">£{((listing.price_pence || 0) / 100).toFixed(2)}{listing.price_type === "hourly" ? "/hr" : ""}</span>
                      {listing.accepts_leus && <span className="text-xs bg-[#10B981] text-white px-2 py-0.5 rounded-full">LEUS</span>}
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-gray-100">
                  <button onClick={() => handleEdit(listing)} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs text-[#1E3A8A] hover:bg-blue-50 transition-colors"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                  <button onClick={() => handleToggleStatus(listing)} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors border-x border-gray-100">
                    {listing.status === "active" ? <><EyeOff className="w-3.5 h-3.5" />Hide</> : <><Eye className="w-3.5 h-3.5" />Show</>}
                  </button>
                  <button onClick={() => handleDelete(listing.id)} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div className="px-4 mt-4 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:"Total Bookings",  value: analytics?.totalBookings || 0,                      Icon: Users,        color:"text-blue-600",   bg:"bg-blue-50" },
              { label:"Completed",       value: analytics?.completedBookings || 0,                  Icon: CheckCircle,  color:"text-green-600",  bg:"bg-green-50" },
              { label:"Total Earned",    value:`£${(analytics?.totalEarned || 0).toFixed(2)}`,      Icon: DollarSign,   color:"text-purple-600", bg:"bg-purple-50" },
              { label:"Active Listings", value: analytics?.activeListings || 0,                     Icon: Package,      color:"text-orange-600", bg:"bg-orange-50" },
            ].map(({ label, value, Icon, color, bg }, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-2`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <p className="text-lg font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#10B981]" />Earnings — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={analytics?.chartData || []}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1E3A8A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={(v: any) => [`£${Number(v).toFixed(2)}`, "Earnings"]} />
                <Area type="monotone" dataKey="earnings" stroke="#1E3A8A" strokeWidth={2} fill="url(#earningsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#10B981]" />Bookings — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={analytics?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, "Bookings"]} />
                <Bar dataKey="bookings" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Completion Rate</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#1E3A8A] to-[#10B981] rounded-full transition-all"
                    style={{ width:`${analytics?.totalBookings > 0 ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100) : 0}%` }} />
                </div>
              </div>
              <span className="text-lg font-bold text-[#1E3A8A]">
                {analytics?.totalBookings > 0 ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT TAB ── */}
      {activeTab === "add" && (
        <div className="px-4 mt-4 pb-6">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-white/30 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">{editingId ? "Edit Listing" : "New Listing"}</h2>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            <div>
              <label className="block text-sm text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))}
                placeholder="e.g. Professional House Cleaning"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Category *</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category:e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm appearance-none">
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                placeholder="Describe your service..." rows={3}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Price (£) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
                  <input type="number" value={form.price_pence} onChange={e => setForm(f => ({ ...f, price_pence:e.target.value }))}
                    placeholder="0.00" min="0" step="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Price Type</label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={form.price_type} onChange={e => setForm(f => ({ ...f, price_type:e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981] text-sm appearance-none">
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Per Hour</option>
                    <option value="quote">Quote</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, accepts_leus:!f.accepts_leus }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${form.accepts_leus ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                {form.accepts_leus ? "✓ Accepts LEUS" : "LEUS Off"}
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, status:f.status === "active" ? "inactive" : "active" }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${form.status === "active" ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                {form.status === "active" ? "✓ Active" : "Inactive"}
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Photos (up to 5)</label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <div className="flex gap-2 flex-wrap">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => { setImages(p => p.filter((_,j) => j !== i)); setImagePreviews(p => p.filter((_,j) => j !== i)); }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-[#10B981] transition-colors">
                    <Camera className="w-6 h-6 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { resetForm(); setActiveTab("listings"); }}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#10B981] text-white py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : editingId ? "Update Listing" : "Create Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


