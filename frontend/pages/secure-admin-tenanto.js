import React, { useState, useEffect } from 'react';
import api, { saveAuth } from '../lib/api';

export default function SecureAdmin() {
  const [email, setEmail] = useState('admin@tenanto.test');
  const [password, setPassword] = useState('Admin#1234');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) fetchAnalytics();
  }, [token]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const resp = await api.post('/auth/admin-login', { email, password });
      saveAuth(resp.data.token, resp.data.user);
      setToken(resp.data.token);
      setUser(resp.data.user);
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  }

  async function fetchAnalytics() {
    try {
      const resp = await api.get('/admin/analytics');
      setAnalytics(resp.data);
    } catch (err) {
      setError('Failed to load analytics');
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm p-6 border rounded">
          <h2 className="text-xl font-bold mb-4">Secure Admin Login</h2>
          <p className="text-xs text-gray-600 mb-4">Path: /secure-admin-tenanto — use the sample credentials to login.</p>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <label className="block mb-2">Email
            <input className="w-full border px-2 py-1" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="block mb-4">Password
            <input type="password" className="w-full border px-2 py-1" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button className="bg-blue-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="mt-4">
        <h2 className="font-semibold">Logged in as</h2>
        <div>{user?.fullName} — {user?.email}</div>
      </div>
      <div className="mt-6">
        <h2 className="font-semibold">Site Analytics</h2>
        {analytics ? (
          <ul>
            <li>Users: {analytics.users}</li>
            <li>Listings (total): {analytics.listings}</li>
            <li>Active listings: {analytics.activeListings}</li>
            <li>Payments: {analytics.payments}</li>
            <li>Escrowed (naira): {analytics.escrowedNaira}</li>
          </ul>
        ) : (<div>Loading analytics...</div>)}
      </div>
    </div>
  );
}
