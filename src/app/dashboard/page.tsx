'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowUpTrayIcon, 
  ChartBarIcon, 
  TableCellsIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data = await response.json();
          setDatasets(data);
        }
      } catch (error) {
        console.error('Error fetching datasets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {session?.user?.name || 'User'}! Here's an overview of your data analysis.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link 
            href="/dashboard/upload"
            className="relative block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600">
                <ArrowUpTrayIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Dataset</h3>
                <p className="mt-1 text-sm text-gray-500">Upload a new dataset for analysis</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard/data-table"
            className="relative block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600">
                <TableCellsIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">View Data</h3>
                <p className="mt-1 text-sm text-gray-500">Browse your uploaded datasets</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard/bar-charts"
            className="relative block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600">
                <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Bar Charts</h3>
                <p className="mt-1 text-sm text-gray-500">Visualize data with bar charts</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard/pie-charts"
            className="relative block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600">
                <ChartPieIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Pie Charts</h3>
                <p className="mt-1 text-sm text-gray-500">Visualize data with pie charts</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Datasets */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Datasets</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
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
    </div>
  );
}
