'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

export default function PieCharts() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');
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
              
              // Set default category and value based on column types
              const textColumn = selectedDataset.columns.find((col: any) => col.type === 'text');
              const numericColumn = selectedDataset.columns.find((col: any) => col.type === 'numeric');
              
              if (textColumn) setSelectedCategory(textColumn.name);
              if (numericColumn) setSelectedValue(numericColumn.name);
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
    if (currentDataset && selectedCategory && selectedValue) {
      generateChartData();
    }
  }, [currentDataset, selectedCategory, selectedValue]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset selections
      setSelectedCategory('');
      setSelectedValue('');
      
      // Set default category and value based on column types
      const textColumn = selected.columns.find((col: any) => col.type === 'text');
      const numericColumn = selected.columns.find((col: any) => col.type === 'numeric');
      
      if (textColumn) setSelectedCategory(textColumn.name);
      if (numericColumn) setSelectedValue(numericColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedCategory || !selectedValue) return;

    const categoryType = currentDataset.columns.find((col: any) => col.name === selectedCategory)?.type;
    const valueType = currentDataset.columns.find((col: any) => col.name === selectedValue)?.type;

    // For pie charts, category should be categorical (text) and value should be numeric
    if (valueType !== 'numeric') {
      setError('Value must be a numeric column for pie charts');
      setChartData(null);
      return;
    }

    // Group data by category values and calculate aggregate values
    const groupedData: Record<string, number[]> = {};
    
    currentDataset.data.forEach((item: any) => {
      const categoryValue = item[selectedCategory]?.toString() || 'Undefined';
      const numValue = parseFloat(item[selectedValue]);
      
      if (!isNaN(numValue)) {
        if (!groupedData[categoryValue]) {
          groupedData[categoryValue] = [];
        }
        groupedData[categoryValue].push(numValue);
      }
    });

    // Calculate sum for each category
    const labels = Object.keys(groupedData);
    const data = labels.map(label => {
      const values = groupedData[label];
      return values.reduce((acc, val) => acc + val, 0); // Sum
    });

    // Generate random colors
    const backgroundColors = labels.map(() => 
      `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.6)`
    );
    const borderColors = backgroundColors.map(color => color.replace('0.6', '1'));

    setChartData({
      labels,
      datasets: [
        {
          label: `Total ${selectedValue} by ${selectedCategory}`,
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
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
          <h1 className="text-3xl font-bold text-gray-900">Pie Charts</h1>
          <p className="mt-2 text-gray-600">Visualize your data with pie charts.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Pie Charts</h1>
            <p className="mt-2 text-gray-600">Visualize your data with pie charts.</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="dataset-select" className="block text-sm font-bold text-gray-900">
                Select Dataset
              </label>
              <select
                id="dataset-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md font-bold text-gray-900"
                value={currentDataset?._id || ''}
                onChange={handleDatasetChange}
              >
                {datasets.map((dataset) => (
                  <option key={dataset._id} value={dataset._id} className="font-bold text-gray-900">
                    {dataset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category-select" className="block text-sm font-bold text-gray-900">
                Category (Segments)
              </label>
              <select
                id="category-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md font-bold text-gray-900"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="" className="font-bold text-gray-900">Select Category</option>
                {currentDataset?.columns?.map((column: any) => (
                  <option key={column.name} value={column.name} className="font-bold text-gray-900">
                    {column.name} ({column.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="value-select" className="block text-sm font-bold text-gray-900">
                Value (Size)
              </label>
              <select
                id="value-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md font-bold text-gray-900"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
              >
                <option value="" className="font-bold text-gray-900">Select Value</option>
                {currentDataset?.columns?.filter((column: any) => column.type === 'numeric').map((column: any) => (
                  <option key={column.name} value={column.name} className="font-bold text-gray-900">
                    {column.name} (numeric)
                  </option>
                ))}
              </select>
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
            <div className="h-96 flex justify-center">
              <div style={{ maxWidth: '500px', width: '100%' }}>
                <Pie 
                  data={chartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          font: {
                            weight: 'bold',
                            size: 12
                          },
                          color: '#111827' // text-gray-900
                        }
                      },
                      title: {
                        display: true,
                        text: `${selectedValue} by ${selectedCategory}`,
                        font: {
                          weight: 'bold',
                          size: 16
                        },
                        color: '#111827' // text-gray-900
                      },
                      tooltip: {
                        titleFont: {
                          weight: 'bold',
                          size: 14
                        },
                        bodyFont: {
                          weight: 'bold',
                          size: 12
                        },
                        titleColor: '#111827',
                        bodyColor: '#111827',
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            // Calculate total with proper type handling
                            const data = context.chart.data.datasets[0].data;
                            const total = Array.isArray(data) ? 
                              data.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) : 0;
                            const percentage = total > 0 ? Math.round(((value as number) / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {!selectedCategory || !selectedValue
                  ? 'Select category and value to generate a pie chart'
                  : 'No data available for the selected fields'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
