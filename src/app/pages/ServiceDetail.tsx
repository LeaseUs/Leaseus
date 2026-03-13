import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Star, MapPin, Clock, Shield, CheckCircle, Calendar, MessageCircle } from "lucide-react";

export function ServiceDetail() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"fiat" | "leus">("fiat");

  const service = {
    name: "Professional Cleaning",
    provider: "CleanPro Services",
    rating: 4.9,
    reviews: 156,
    price: 50,
    location: "2.3 mi away",
    leusAccepted: true,
    description: "Expert cleaning services for homes and offices. Our professional team uses eco-friendly products and guarantees satisfaction.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop",
    availability: "Mon-Sat, 8:00 AM - 6:00 PM",
    features: [
      "Background-checked professionals",
      "Eco-friendly cleaning products",
      "100% satisfaction guarantee",
      "Flexible scheduling",
      "Insurance covered",
    ],
  };

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
  ];

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select a date and time");
      return;
    }
    // Navigate to booking confirmation
    navigate("/home");
  };

  const finalPrice = paymentMethod === "leus" ? service.price * 0.95 : service.price;
  const discount = paymentMethod === "leus" ? service.price * 0.05 : 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header Image */}
      <div className="relative">
        <img
          src={service.image}
          alt={service.name}
          className="w-full h-64 object-cover"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        {service.leusAccepted && (
          <div className="absolute top-4 right-4 bg-[#10B981] text-white px-3 py-1.5 rounded-full text-sm">
            LEUS Accepted
          </div>
        )}
      </div>

      {/* Service Info */}
      <div className="px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h1 className="text-2xl text-gray-800 mb-2">{service.name}</h1>
        <p className="text-base text-gray-600 mb-3">{service.provider}</p>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-800">{service.rating}</span>
            <span className="text-sm text-gray-500">({service.reviews} reviews)</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {service.location}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{service.availability}</span>
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h3 className="text-base text-gray-800 mb-2">About this service</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
      </div>

      {/* Features */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h3 className="text-base text-gray-800 mb-3">What's included</h3>
        <div className="space-y-2">
          {service.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Form */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <h3 className="text-base text-gray-800 mb-4">Book this service</h3>
        
        {/* Date Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">Select Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* Time Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">Select Time</label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`py-2.5 rounded-lg text-sm transition-colors ${
                  selectedTime === time
                    ? "bg-[#10B981] text-white"
                    : "bg-gray-50 text-gray-700 border border-gray-200 hover:border-[#10B981]"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        {service.leusAccepted && (
          <div className="mb-4">
            <label className="block text-sm text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("fiat")}
                className={`py-3 rounded-xl text-sm transition-colors ${
                  paymentMethod === "fiat"
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-gray-50 text-gray-700 border border-gray-200"
                }`}
              >
                Pay with GBP (£)
              </button>
              <button
                onClick={() => setPaymentMethod("leus")}
                className={`py-3 rounded-xl text-sm transition-colors relative ${
                  paymentMethod === "leus"
                    ? "bg-[#10B981] text-white"
                    : "bg-gray-50 text-gray-700 border border-gray-200"
                }`}
              >
                Pay with LEUS (Ł)
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  5% off
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service price:</span>
            <span className="text-gray-800">
              {paymentMethod === "fiat" ? `£${service.price}` : `Ł${service.price}`}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">LEUS discount (5%):</span>
              <span className="text-green-600">-Ł{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Escrow protection:</span>
            <span className="text-gray-800">Free</span>
          </div>
          <div className="h-px bg-gray-200 my-2"></div>
          <div className="flex justify-between">
            <span className="text-gray-800">Total:</span>
            <span className="text-lg text-[#1E3A8A]">
              {paymentMethod === "fiat" ? `£${finalPrice}` : `Ł${finalPrice.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Escrow Info */}
        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Payment will be held in secure escrow and only released to the provider after you confirm service completion.
          </p>
        </div>
      </div>

      {/* Contact Provider */}
      <div className="mt-2 px-4 py-4 bg-white/80 backdrop-blur-md border border-white/30">
        <button className="w-full border border-[#1E3A8A] text-[#1E3A8A] py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Contact Provider
        </button>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-white/20 p-4">
        <button
          onClick={handleBooking}
          className="w-full bg-[#10B981] text-white py-4 rounded-xl hover:bg-[#0d9668] transition-colors"
        >
          Book Now - {paymentMethod === "fiat" ? `£${finalPrice}` : `Ł${finalPrice.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
