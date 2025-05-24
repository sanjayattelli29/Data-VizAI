'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  UserCircleIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  PencilIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  TrashIcon,
  EyeIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import Header from '@/components/Header';

interface UploadHistoryItem {
  _id: string;
  datasetId: string;
  datasetName: string;
  metrics: Record<string, any>;
  graphUrls: Array<{
    type: string;
    url: string;
    publicId: string;
  }>;
  createdAt: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  imageUrl: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    imageUrl: ''
  });
  
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UploadHistoryItem | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUserProfile();
      fetchUploadHistory(session.user.id);
      fetchDatasets();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, session, router]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile({
            name: data.profile.name || session?.user?.name || '',
            email: data.profile.email || session?.user?.email || '',
            phone: data.profile.phone || '',
            bio: data.profile.bio || '',
            imageUrl: data.profile.imageUrl || session?.user?.image || ''
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('An error occurred while fetching your profile');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUploadHistory = async (userId: string) => {
    try {
      const response = await fetch(`/api/upload-history?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setUploadHistory(data.history || []);
      } else {
        console.error('Failed to fetch upload history:', data.error);
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const fetchDatasets = async () => {
    try {
      setIsLoadingDatasets(true);
      const response = await fetch('/api/datasets');
      if (response.ok) {
        const data = await response.json();
        setDatasets(data);
      }
    } catch (error) {
      console.error('Error fetching datasets:', error);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError('');
      
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      
      if (response.ok) {
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('An error occurred while updating your profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewItem = (item: UploadHistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/upload-history/${itemToDelete}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the deleted item from the state
        setUploadHistory(uploadHistory.filter(item => item._id !== itemToDelete));
        setShowDeleteModal(false);
        setItemToDelete(null);
        
        // If the deleted item is the selected item, clear the selection
        if (selectedItem && selectedItem._id === itemToDelete) {
          setSelectedItem(null);
        }
      } else {
        console.error('Failed to delete upload history:', data.error);
      }
    } catch (error) {
      console.error('Error deleting upload history:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Profile</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User Profile */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PencilIcon className="-ml-1 mr-1 h-4 w-4" />
                      Edit
                    </button>
                  ) : null}
                </div>
                
                {isEditing ? (
                  <form onSubmit={handleSaveProfile}>
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <div className="relative">
                          {profile.imageUrl ? (
                            <Image
                              src={profile.imageUrl}
                              alt={profile.name}
                              width={100}
                              height={100}
                              className="h-32 w-32 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserCircleIcon className="h-24 w-24 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0">
                            <input
                              type="text"
                              name="imageUrl"
                              value={profile.imageUrl}
                              onChange={handleProfileChange}
                              placeholder="Image URL"
                              className="sr-only"
                            />
                            <label
                              htmlFor="imageUrl"
                              className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={profile.name}
                          onChange={handleProfileChange}
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={profile.email}
                          onChange={handleProfileChange}
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={profile.phone}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                          Bio
                        </label>
                        <textarea
                          name="bio"
                          id="bio"
                          rows={3}
                          value={profile.bio}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                          Profile Image URL
                        </label>
                        <input
                          type="text"
                          name="imageUrl"
                          id="imageUrl"
                          value={profile.imageUrl}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      {error && (
                        <div className="text-sm text-red-600">
                          {error}
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      {profile.imageUrl ? (
                        <Image
                          src={profile.imageUrl}
                          alt={profile.name}
                          width={100}
                          height={100}
                          className="h-32 w-32 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserCircleIcon className="h-24 w-24 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-center text-gray-900">{profile.name}</h3>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <dl className="divide-y divide-gray-200">
                        <div className="py-3 flex items-center">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                            Email
                          </dt>
                          <dd className="ml-auto text-sm text-gray-900">{profile.email}</dd>
                        </div>
                        
                        <div className="py-3 flex items-center">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                            Phone
                          </dt>
                          <dd className="ml-auto text-sm text-gray-900">{profile.phone || 'Not provided'}</dd>
                        </div>
                        
                        {profile.bio && (
                          <div className="py-3">
                            <dt className="text-sm font-medium text-gray-500 mb-1">Bio</dt>
                            <dd className="text-sm text-gray-900">{profile.bio}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Upload History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Previous Upload History</h2>
              </div>
              
              {selectedItem ? (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium">{selectedItem.datasetName}</h3>
                    <button 
                      onClick={handleCloseDetails}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-center text-gray-500 mb-2">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
                      <ClockIcon className="h-4 w-4 ml-4 mr-2" />
                      <span>{new Date(selectedItem.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h4 className="text-md font-semibold mb-4">Metrics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(selectedItem.metrics).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-500 text-sm">{key.replace(/_/g, ' ')}</p>
                          <p className="text-md font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-semibold mb-4">Visualizations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedItem.graphUrls.map((graph, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-500 text-sm mb-2">{graph.type}</p>
                          <Image
                            src={graph.url}
                            alt={`${graph.type} visualization`}
                            width={400}
                            height={300}
                            className="rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {/* Recent Datasets Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Datasets</h3>
                    {isLoadingDatasets ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                      </div>
                    ) : datasets.length > 0 ? (
                      <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {datasets.slice(0, 5).map((dataset: any) => (
                            <li key={dataset._id}>
                              <Link href={`/dashboard/data-table?id=${dataset._id}`} className="block hover:bg-gray-50">
                                <div className="px-4 py-4 sm:px-6">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-indigo-600 truncate">{dataset.name}</p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        {new Date(dataset.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                      <p className="flex items-center text-sm text-gray-500">
                                        {dataset.columns?.length || 0} columns • {dataset.data?.length || 0} rows
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                        <p className="text-gray-500">No datasets found. Upload your first dataset to get started!</p>
                        <Link 
                          href="/dashboard/upload"
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                          Upload Dataset
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Upload History Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Visualization History</h3>
                    {uploadHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Visualization History</h3>
                        <p className="text-gray-500 mb-6">You haven't created any visualizations yet.</p>
                        <Link
                          href="/dashboard/bar-charts"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
                          Create Your First Visualization
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Dataset
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date & Time
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Charts
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {uploadHistory.map((item) => (
                              <tr key={item._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{item.datasetName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(item.createdAt).toLocaleTimeString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {item.graphUrls.length} charts
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => handleViewItem(item)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                      title="View details"
                                    >
                                      <EyeIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(item._id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Delete"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this upload history? This will permanently remove all associated graphs and metrics.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
