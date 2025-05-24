'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RadarChart() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [availableMetrics, setAvailableMetrics] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data = await response.json();
          setDatasets(data);
          
          // If a dataset ID is provided in the URL, load that dataset
          if (datasetId && data.length > 0) {
            const selectedDataset = data.find((d: any) => d._id === datasetId);
            if (selectedDataset) {
              setCurrentDataset(selectedDataset);
              
              // Set default category and metrics based on column types
              const categoryColumn = selectedDataset.columns.find((col: any) => col.type === 'text');
              const numericColumns = selectedDataset.columns.filter((col: any) => col.type === 'numeric');
              
              setAvailableMetrics(numericColumns);
              
              if (categoryColumn) setSelectedCategory(categoryColumn.name);
              if (numericColumns.length > 0) {
                // Select up to 5 metrics by default
                setSelectedMetrics(numericColumns.slice(0, 5).map((col: any) => col.name));
              }
            } else {
              // If the dataset with the provided ID is not found, load the first dataset
              setCurrentDataset(data[0]);
            }
          } else if (data.length > 0) {
            // If no dataset ID is provided, load the first dataset
            setCurrentDataset(data[0]);
          }
        } else {
          throw new Error('Failed to fetch datasets');
        }
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching datasets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, [datasetId]);

  useEffect(() => {
    if (currentDataset) {
      // Update available metrics when dataset changes
      const numericColumns = currentDataset.columns.filter((col: any) => col.type === 'numeric');
      setAvailableMetrics(numericColumns);
      
      // Set default category based on column types
      const categoryColumn = currentDataset.columns.find((col: any) => col.type === 'text');
      if (categoryColumn) setSelectedCategory(categoryColumn.name);
      
      // Select up to 5 metrics by default
      if (numericColumns.length > 0) {
        setSelectedMetrics(numericColumns.slice(0, 5).map((col: any) => col.name));
      }
    }
  }, [currentDataset]);

  useEffect(() => {
    if (currentDataset && selectedCategory && selectedMetrics.length > 0) {
      generateChartData();
    }
  }, [currentDataset, selectedCategory, selectedMetrics]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
    }
  };

  const handleMetricToggle = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedCategory || selectedMetrics.length === 0) return;

    // Get unique categories
    const uniqueCategories = [...new Set(currentDataset.data.map((item: any) => item[selectedCategory]))];
    
    if (uniqueCategories.length === 0) {
      setError('No valid categories found in the selected column');
      setChartData(null);
      return;
    }

    // Generate random colors for each category
    const colors = uniqueCategories.map(() => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 1)`,
      };
    });

    // Calculate average values for each category and metric
    const datasets = uniqueCategories.map((category, index) => {
      const categoryData = currentDataset.data.filter((item: any) => item[selectedCategory] === category);
      
      const data = selectedMetrics.map(metric => {
        const values = categoryData
          .map((item: any) => parseFloat(item[metric]))
          .filter((value: number) => !isNaN(value));
        
        // Calculate average or return 0 if no valid values
        return values.length > 0 
          ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length
          : 0;
      });

      return {
        label: category,
        data,
        backgroundColor: colors[index].backgroundColor,
        borderColor: colors[index].borderColor,
        borderWidth: 1,
      };
    });

    setChartData({
      labels: selectedMetrics,
      datasets,
    });

    setError('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Radar Chart</h1>
          <p className="mt-2 text-gray-600">Compare multiple metrics across categories with radar charts.</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-4">No datasets found. Upload your first dataset to get started!</p>
          <Link 
            href="/dashboard/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Upload Dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center">
          <Link 
            href={`/dashboard/data-table?id=${currentDataset?._id}`}
            className="mr-4 p-1 rounded-full text-gray-400 hover:text-gray-500"
          >
            <ArrowLeftIcon className="h-6 w-6" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Radar Chart</h1>
            <p className="mt-2 text-gray-600">Compare multiple metrics across categories with radar charts.</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-700">
                Select Dataset
              </label>
              <select
                id="dataset-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={currentDataset?._id || ''}
                onChange={handleDatasetChange}
              >
                {datasets.map((dataset) => (
                  <option key={dataset._id} value={dataset._id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700">
                Category Column
              </label>
              <select
                id="category-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {currentDataset?.columns?.filter((column: any) => column.type === 'text').map((column: any) => (
                  <option key={column.name} value={column.name}>
                    {column.name} (text)
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Metrics (Numeric Columns)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availableMetrics.map((metric) => (
                <div key={metric.name} className="flex items-center">
                  <input
                    id={`metric-${metric.name}`}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={selectedMetrics.includes(metric.name)}
                    onChange={() => handleMetricToggle(metric.name)}
                  />
                  <label htmlFor={`metric-${metric.name}`} className="ml-2 block text-sm text-gray-700">
                    {metric.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="p-6">
          {chartData ? (
            <div className="h-96">
              <Radar 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: `Metrics by ${selectedCategory}`,
                    },
                  },
                  scales: {
                    r: {
                      beginAtZero: true,
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {!selectedCategory
                  ? 'Select a category column to group by'
                  : selectedMetrics.length === 0
                    ? 'Select at least one metric to display'
                    : 'No data available for the selected configuration'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
