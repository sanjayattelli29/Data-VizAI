'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      router.push('/auth/signin?registered=true');
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl"></div>
        
        {/* Decorative Icons */}
        <div className="absolute top-32 left-12 text-orange-500/20 text-4xl">🚀</div>
        <div className="absolute top-48 right-16 text-orange-500/20 text-3xl">💎</div>
        <div className="absolute bottom-40 left-16 text-orange-500/20 text-3xl">⭐</div>
        <div className="absolute bottom-24 right-24 text-orange-500/20 text-4xl">🎯</div>
        <div className="absolute top-64 left-1/4 text-orange-500/20 text-2xl">✨</div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Section - Welcome Text */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
          <div className="max-w-lg">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🏠</span>
                </div>
                <span className="text-2xl font-bold text-white">DataViz-AI</span>
              </div>
              
              <div className="inline-flex items-center px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full mb-8">
                <span className="text-orange-400 mr-2">⚡</span>
                <span className="text-orange-300 text-sm font-medium">Join 10,000+ Students</span>
              </div>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Start Your Journey
              <span className="block text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text">
                Into AI Analytics
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Join thousands of students and professionals who are already transforming their careers with 
              <span className="text-orange-400 font-semibold"> AI-powered data analysis</span>. 
              Start building your future today with our <span className="text-orange-400 font-semibold">revolutionary platform</span>.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center text-gray-300">
                <span className="text-orange-400 mr-3">✅</span>
                <span>Advanced AI models & deep learning tools</span>
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-orange-400 mr-3">✅</span>
                <span>Real-time data visualization & insights</span>
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-orange-400 mr-3">✅</span>
                <span>Exceptional accuracy & lightning speed</span>
              </div>
            </div>

            <div className="flex items-center text-gray-400 text-sm">
              <span className="mr-4">💳 No credit card required</span>
              <span>⚡ Get started in under 2 minutes</span>
            </div>
          </div>
        </div>

        {/* Right Section - Sign Up Form */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
          <div className="w-full max-w-md">
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Create Account
                </h2>
                <p className="text-gray-400">
                  Already have an account?{' '}
                  <Link 
                    href="/auth/signin" 
                    className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="text-red-400 text-sm text-center">{error}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span>Create Account</span>
                      <span className="ml-2">🚀</span>
                    </div>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    By signing up, you agree to our terms and start your AI journey
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}