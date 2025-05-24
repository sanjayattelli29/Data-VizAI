'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function LineCharts() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedXAxis, setSelectedXAxis] = useState<string>('');
  const [selectedYAxis, setSelectedYAxis] = useState<string>('');
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
              
              // Set default X and Y axes based on column types
              const textColumn = selectedDataset.columns.find((col: any) => col.type === 'text');
              const numericColumn = selectedDataset.columns.find((col: any) => col.type === 'numeric');
              
              if (textColumn) setSelectedXAxis(textColumn.name);
              if (numericColumn) setSelectedYAxis(numericColumn.name);
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
    if (currentDataset && selectedXAxis && selectedYAxis) {
      generateChartData();
    }
  }, [currentDataset, selectedXAxis, selectedYAxis]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset axis selections
      setSelectedXAxis('');
      setSelectedYAxis('');
      
      // Set default X and Y axes based on column types
      const textColumn = selected.columns.find((col: any) => col.type === 'text');
      const numericColumn = selected.columns.find((col: any) => col.type === 'numeric');
      
      if (textColumn) setSelectedXAxis(textColumn.name);
      if (numericColumn) setSelectedYAxis(numericColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedXAxis || !selectedYAxis) return;

    const xAxisType = currentDataset.columns.find((col: any) => col.name === selectedXAxis)?.type;
    const yAxisType = currentDataset.columns.find((col: any) => col.name === selectedYAxis)?.type;

    // For line charts, X-axis is typically categorical (text) or sequential, and Y-axis should be numeric
    if (yAxisType !== 'numeric') {
      setError('Y-axis must be a numeric column for line charts');
      setChartData(null);
      return;
    }

    // Sort data by X-axis values if they are numeric or dates
    let sortedData = [...currentDataset.data];
    if (xAxisType === 'numeric') {
      sortedData.sort((a, b) => parseFloat(a[selectedXAxis]) - parseFloat(b[selectedXAxis]));
    }

    // Extract X and Y values
    const labels = sortedData.map(item => item[selectedXAxis]);
    const data = sortedData.map(item => parseFloat(item[selectedYAxis]));

    // Generate random color
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const backgroundColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
    const borderColor = `rgba(${r}, ${g}, ${b}, 1)`;

    setChartData({
      labels,
      datasets: [
        {
          label: `${selectedYAxis} by ${selectedXAxis}`,
          data,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          tension: 0.3, // Adds a slight curve to the line
          fill: false,
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
          <h1 className="text-3xl font-bold text-gray-900">Line Charts</h1>
          <p className="mt-2 text-gray-600">Visualize your data with line charts.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Line Charts</h1>
            <p className="mt-2 text-gray-600">Visualize your data with line charts.</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
              <label htmlFor="x-axis-select" className="block text-sm font-medium text-gray-700">
                X-Axis
              </label>
              <select
                id="x-axis-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedXAxis}
                onChange={(e) => setSelectedXAxis(e.target.value)}
              >
                <option value="">Select X-Axis</option>
                {currentDataset?.columns?.map((column: any) => (
                  <option key={column.name} value={column.name}>
                    {column.name} ({column.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="y-axis-select" className="block text-sm font-medium text-gray-700">
                Y-Axis (Values)
              </label>
              <select
                id="y-axis-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedYAxis}
                onChange={(e) => setSelectedYAxis(e.target.value)}
              >
                <option value="">Select Y-Axis</option>
                {currentDataset?.columns?.filter((column: any) => column.type === 'numeric').map((column: any) => (
                  <option key={column.name} value={column.name}>
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
            <div className="h-96">
              <Line 
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
                      text: `${selectedYAxis} by ${selectedXAxis}`,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: selectedYAxis,
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: selectedXAxis,
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {!selectedXAxis || !selectedYAxis
                  ? 'Select X and Y axes to generate a line chart'
                  : 'No data available for the selected axes'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
