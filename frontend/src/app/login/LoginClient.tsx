'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';

export default function LoginClient() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useUserPreferences();

  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/videos';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await loginUser(formData);
      localStorage.setItem('access', userData.token.access);
      localStorage.setItem('refresh', userData.token.refresh);
      await refresh();
      router.replace(next);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg"
      >
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Log In</h1>

        {error && (
          <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}

        {['username', 'password'].map((field, index) => (
          <div key={index} className="mb-4">
            <label
              htmlFor={field}
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {field[0].toUpperCase() + field.slice(1)}
            </label>
            <input
              type={field === 'password' ? 'password' : 'text'}
              name={field}
              id={field}
              value={(formData as any)[field]}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition cursor-pointer"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
