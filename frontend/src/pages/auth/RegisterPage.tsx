import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api.client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/api/auth/register', { email, password, displayName });
      setSuccess(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">{success}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Register</button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
      </p>
    </div>
  );
}
