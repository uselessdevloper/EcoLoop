import React, { useState } from 'react';
import { User, Smartphone, MapPin, DollarSign, Navigation, ArrowRight, Loader2 } from 'lucide-react';

export default function ConsumerForm({ onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    consumer_name: 'Anil Sharma',
    device: 'MacBook Pro 15" (2019)',
    latitude: 28.6139,
    longitude: 77.2090,
    estimated_price: 250.00
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' || name === 'estimated_price' 
        ? parseFloat(value) || value 
        : value
    }));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(position.coords.latitude.toFixed(4)),
            longitude: parseFloat(position.coords.longitude.toFixed(4))
          }));
        },
        (error) => {
          console.warn("Geolocation permission denied or error:", error);
          alert("Could not fetch device location. Using default location.");
        }
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800/80 max-w-xl w-full mx-auto glow-emerald">
      <div className="flex items-center space-x-3 mb-6 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Submit E-Waste Pickup</h2>
          <p className="text-xs text-slate-400">Request recycling pickup & instant partner match</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Consumer Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Consumer Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              name="consumer_name"
              required
              value={formData.consumer_name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Device Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            E-Waste Device
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              name="device"
              required
              value={formData.device}
              onChange={handleChange}
              placeholder="e.g. iPhone 12 Pro, Old Monitor"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Coordinates: Latitude & Longitude */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Latitude
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                step="any"
                name="latitude"
                required
                value={formData.latitude}
                onChange={handleChange}
                placeholder="28.6139"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Longitude
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                step="any"
                name="longitude"
                required
                value={formData.longitude}
                onChange={handleChange}
                placeholder="77.2090"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Auto Location Button */}
        <button
          type="button"
          onClick={handleGetLocation}
          className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 flex items-center justify-center space-x-2 transition"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>Use Current GPS Location</span>
        </button>

        {/* Estimated Price */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Estimated Price ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="number"
              step="0.01"
              name="estimated_price"
              required
              value={formData.estimated_price}
              onChange={handleChange}
              placeholder="250.00"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] mt-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting Pickup Request...</span>
            </>
          ) : (
            <>
              <span>Submit & Dispatch Pickup</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
