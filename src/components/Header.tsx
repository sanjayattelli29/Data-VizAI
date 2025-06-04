'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { 
  UserCircleIcon, 
  ChevronDownIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setProfileImage(session.user.image || '');
      setUserName(session.user.name || session.user.email?.split('@')[0] || 'User');
      
      // Try to fetch user profile for custom image if available
      fetchUserProfile();
    }
  }, [status, session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile && data.profile.imageUrl) {
          setProfileImage(data.profile.imageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:shadow-lg transition-all duration-200">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              DataViz
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          <Link href="/features" className="text-sm font-semibold leading-6 text-gray-700 hover:text-indigo-600 transition-colors duration-200">
            Features
          </Link>
          <Link href="/pricing" className="text-sm font-semibold leading-6 text-gray-700 hover:text-indigo-600 transition-colors duration-200">
            Pricing
          </Link>
          <Link href="/about" className="text-sm font-semibold leading-6 text-gray-700 hover:text-indigo-600 transition-colors duration-200">
            About
          </Link>
        </div>

        {/* Right Section */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:space-x-4">
          {session ? (
            <>
              {/* Dashboard Link */}
              <Link 
                href="/dashboard" 
                className="text-sm font-semibold leading-6 text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
              >
                Dashboard
              </Link>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  onClick={toggleDropdown}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {/* Profile Image */}
                  <div className="relative">
                    {profileImage ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-100">
                        <Image
                          src={profileImage}
                          alt={userName}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                        <UserCircleIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>

                  {/* User Info */}
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500">Online</div>
                  </div>

                  {/* Dropdown Arrow */}
                  <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-100 z-50">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {profileImage ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={profileImage}
                              alt={userName}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                            <UserCircleIcon className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{userName}</div>
                          <div className="text-sm text-gray-500">{session?.user?.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserCircleIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Your Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Settings
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="py-2 border-t border-gray-100">
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                        onClick={async () => {
                          await signOut({ redirect: false });
                          window.location.href = '/auth/signin';
                          setDropdownOpen(false);
                        }}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/auth/signin" className="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors duration-200">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg transition-all duration-200"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 z-50 bg-black bg-opacity-25"></div>
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DataViz
                </span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  <Link
                    href="/features"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="/pricing"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/about"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                </div>
                <div className="py-6">
                  {session ? (
                    <>
                      {/* Mobile Profile Section */}
                      <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {profileImage ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden">
                              <Image
                                src={profileImage}
                                alt={userName}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                              <UserCircleIcon className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{userName}</div>
                            <div className="text-sm text-gray-600">{session?.user?.email}</div>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/dashboard"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={async () => {
                          await signOut({ redirect: false });
                          window.location.href = '/auth/signin';
                          setMobileMenuOpen(false);
                        }}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/signin"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/auth/signup"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-indigo-600 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}