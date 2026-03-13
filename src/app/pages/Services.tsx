import { useState } from "react";
import { Search, SlidersHorizontal, Star, MapPin, ChevronRight } from "lucide-react";

export function Services() {
  const [showFilters, setShowFilters] = useState(false);
  const [leusOnly, setLeusOnly] = useState(false);

  const services = [
    {
      id: 1,
      name: "Professional Cleaning",
      provider: "CleanPro Services",
      rating: 4.9,
      reviews: 156,
      price: "£50/hr",
      location: "2.3 mi",
      leusAccepted: true,
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
      category: "Cleaning",
    },
    {
      id: 2,
      name: "Emergency Plumbing",
      provider: "QuickFix Plumbers",
      rating: 4.8,
      reviews: 203,
      price: "£75/hr",
      location: "1.5 mi",
      leusAccepted: true,
      image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop",
      category: "Plumbing",
    },
    {
      id: 3,
      name: "Mobile Car Detailing",
      provider: "Shine & Drive",
      rating: 4.7,
      reviews: 89,
      price: "£40",
      location: "3.1 mi",
      leusAccepted: false,
      image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop",
      category: "Car Care",
    },
    {
      id: 4,
      name: "Hair Styling",
      provider: "Style Studio",
      rating: 4.9,
      reviews: 312,
      price: "£35",
      location: "0.8 mi",
      leusAccepted: true,
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
      category: "Beauty",
    },
    {
      id: 5,
      name: "Interior Painting",
      provider: "ColorCraft Painters",
      rating: 4.6,
      reviews: 67,
      price: "£200/room",
      location: "4.2 mi",
      leusAccepted: true,
      image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop",
      category: "Painting",
    },
    {
      id: 6,
      name: "Event Photography",
      provider: "Capture Moments",
      rating: 5.0,
      reviews: 124,
      price: "£300/event",
      location: "2.7 mi",
      leusAccepted: false,
      image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=300&fit=crop",
      category: "Photography",
    },
  ];

  const filteredServices = leusOnly
    ? services.filter((s) => s.leusAccepted)
    : services;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-6 rounded-b-3xl">
        <h1 className="text-xl text-white mb-4">Find Services</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for services..."
            className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-md rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] border border-white/30"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-white/30"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setLeusOnly(!leusOnly)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              leusOnly
                ? "bg-[#10B981] text-white"
                : "bg-white/20 backdrop-blur-sm text-white border border-white/30"
            }`}
          >
            LEUS Only
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-600">
          {filteredServices.length} services available
        </p>
      </div>

      {/* Services List */}
      <div className="px-4 space-y-4 pb-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-white/30"
          >
            <div className="relative">
              <img
                src={service.image}
                alt={service.name}
                className="w-full h-48 object-cover"
              />
              {service.leusAccepted && (
                <span className="absolute top-3 right-3 bg-[#10B981] text-white text-xs px-3 py-1 rounded-full">
                  LEUS Accepted
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-base text-gray-800 mb-1">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.provider}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg text-[#1E3A8A]">{service.price}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{service.rating}</span>
                  <span className="text-gray-400">({service.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{service.location}</span>
                </div>
              </div>

              <button className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-lg hover:bg-[#152d6b] transition-colors flex items-center justify-center gap-2">
                View Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}