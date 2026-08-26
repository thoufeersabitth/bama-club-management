import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, Key, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_USERS } from '../../services/initialData';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        navigate('/portal');
      } else {
        setError(res.message || 'Invalid Username/Staff ID or Password.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-martial-pattern opacity-10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 via-amber-500 to-black p-0.5 shadow-xl mx-auto border border-amber-500/40 overflow-hidden">
            <img
              src="/logo bama_240616_200739.jpg.jpeg"
              alt="B.A.M.A. Official Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">OFFICE PORTAL LOGIN</h1>
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">
            Brave Academy Management System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-center gap-2 font-bold shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Secure Login Form */}
        <form onSubmit={handleLogin} className="space-y-5 text-sm">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">Username / Staff ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Staff Username or ID (e.g. admin, shafi, STF-101)..."
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500 font-medium placeholder-gray-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">Account Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Account Password..."
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500 font-medium placeholder-gray-500 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Sign In To Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-gray-400 font-medium">
            🔒 Protected Enterprise Portal | Authorized Senseis & Staff Only
          </p>
        </div>
      </div>
    </div>
  );
}
