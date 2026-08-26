import React from 'react';
import { AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Portal Error Boundary caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.removeItem('bama_cadets_roster');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/portal/students';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07080C] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-500 shadow-xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Restoring Office Portal Session</h2>
          <p className="text-xs text-gray-400 max-w-md leading-relaxed">
            Stale session cache detected. Click below to reset roster cache and reload Student Management.
          </p>

          {this.state.error && (
            <div className="w-full max-w-xl p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-left text-xs text-red-300 font-mono overflow-auto max-h-40">
              <strong>Error Trace:</strong> {this.state.error.toString()}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-red-900/50 flex items-center gap-2 transition transform hover:-translate-y-0.5"
          >
            <RefreshCw className="w-4 h-4" /> Reset Roster & Open Student Management
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
