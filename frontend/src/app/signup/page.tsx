'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiWithLogout } from '@/lib/useApiWithLogout';

export default function SignupPage() {
  const api = useApiWithLogout();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.signupUser(formData);
      router.push('/login?next=/account/setup');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
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
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Sign Up
        </h1>

        {error && (
          <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}

        {['username', 'email', 'password', 'password2'].map((field, index) => (
          <div key={index} className="mb-4">
            <label
              htmlFor={field}
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {field === 'password2' ? 'Confirm Password' : field[0].toUpperCase() + field.slice(1)}
            </label>
            <input
              type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}
