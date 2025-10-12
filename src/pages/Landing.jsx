import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="bg-blue-950/50 backdrop-blur-md shadow-2xl sticky top-0 z-40 border-b border-blue-800/30">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <span className="text-4xl animate-pulse">🚨</span>
                Raftaar Help Emergency Seva
              </h1>
              <p className="text-blue-200 text-sm mt-1">Your Trusted Emergency Response System</p>
            </div>
            <div className="hidden md:block">
              <div className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg">
                Emergency: 112
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="text-center text-white mb-16 animate-slideUp">
          <div className="inline-block mb-6">
            <span className="text-7xl md:text-8xl animate-bounce">🆘</span>
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Emergency Help at Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-red-400">
              Fingertips
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Quick, reliable emergency assistance when you need it most.
            Get connected to the nearest help services in seconds.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-2">24/7</div>
              <div className="text-sm md:text-base text-blue-200">Available</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-green-300 mb-2">&lt;5min</div>
              <div className="text-sm md:text-base text-blue-200">Response Time</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-red-300 mb-2">100%</div>
              <div className="text-sm md:text-base text-blue-200">Secure</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105 hover:shadow-2xl border border-white/20">
            <div className="text-5xl mb-6">⚡</div>
            <h3 className="text-2xl font-bold text-white mb-3">Instant Response</h3>
            <p className="text-blue-100 leading-relaxed">
              Get immediate assistance with our real-time emergency response system
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105 hover:shadow-2xl border border-white/20">
            <div className="text-5xl mb-6">📍</div>
            <h3 className="text-2xl font-bold text-white mb-3">Location Based</h3>
            <p className="text-blue-100 leading-relaxed">
              Automatically connect to the nearest emergency services based on your location
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105 hover:shadow-2xl border border-white/20">
            <div className="text-5xl mb-6">🔒</div>
            <h3 className="text-2xl font-bold text-white mb-3">Safe & Secure</h3>
            <p className="text-blue-100 leading-relaxed">
              Your information is protected with advanced security measures
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-16">
          <Link
            to="/emergency"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xl md:text-2xl px-16 py-6 rounded-full shadow-2xl transition transform hover:scale-110 hover:shadow-red-500/50 border-4 border-white/20"
          >
            <span className="text-3xl">🚨</span>
            Request Emergency Help
            <span className="text-3xl">→</span>
          </Link>
          <p className="text-blue-200 text-sm mt-4">Click to get immediate assistance</p>
        </div>

        {/* Emergency Types */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/10">
          <h3 className="text-3xl font-bold text-white text-center mb-10">Emergency Services Available</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center transform hover:scale-110 transition-all cursor-pointer">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-2xl hover:shadow-red-500/50 border-4 border-white/20">
                <span className="text-5xl">🚑</span>
              </div>
              <p className="text-white font-bold text-lg">Medical</p>
              <p className="text-blue-200 text-sm mt-1">102</p>
            </div>

            <div className="text-center transform hover:scale-110 transition-all cursor-pointer">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-2xl hover:shadow-orange-500/50 border-4 border-white/20">
                <span className="text-5xl">🚒</span>
              </div>
              <p className="text-white font-bold text-lg">Fire</p>
              <p className="text-blue-200 text-sm mt-1">101</p>
            </div>

            <div className="text-center transform hover:scale-110 transition-all cursor-pointer">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-2xl hover:shadow-blue-500/50 border-4 border-white/20">
                <span className="text-5xl">👮</span>
              </div>
              <p className="text-white font-bold text-lg">Police</p>
              <p className="text-blue-200 text-sm mt-1">100</p>
            </div>

            <div className="text-center transform hover:scale-110 transition-all cursor-pointer">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-2xl hover:shadow-purple-500/50 border-4 border-white/20">
                <span className="text-5xl">🆘</span>
              </div>
              <p className="text-white font-bold text-lg">All Services</p>
              <p className="text-blue-200 text-sm mt-1">112</p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 grid md:grid-cols-4 gap-6 text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-white font-semibold">Verified Service</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">🛡️</div>
            <p className="text-white font-semibold">Secure Platform</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">⚡</div>
            <p className="text-white font-semibold">Lightning Fast</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-4xl mb-3">🌐</div>
            <p className="text-white font-semibold">Pan India</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-blue-950/80 backdrop-blur-md py-10 mt-20 border-t border-blue-800/30 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-4">About Us</h4>
              <p className="text-blue-300 text-sm leading-relaxed">
                Raftaar Help Emergency Seva provides quick and reliable emergency assistance across India.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2 text-blue-300 text-sm">
                <li><Link to="/emergency" className="hover:text-white transition">Emergency Services</Link></li>
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-4">Emergency Hotlines</h4>
              <ul className="space-y-2 text-blue-300 text-sm">
                <li>Police: <span className="text-white font-bold">100</span></li>
                <li>Fire: <span className="text-white font-bold">101</span></li>
                <li>Ambulance: <span className="text-white font-bold">102</span></li>
                <li>All Services: <span className="text-white font-bold">112</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-800/30 pt-6 text-center">
            <p className="text-blue-300">&copy; 2025 Dmnhospadsahares. All rights reserved.</p>
            <p className="text-blue-400 text-sm mt-2">Emergency services available 24/7 across India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
