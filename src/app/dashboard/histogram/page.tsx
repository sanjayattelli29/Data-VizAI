'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Histogram() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [binCount, setBinCount] = useState<number>(10);
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
            const selectedDataset = data.find((d: unknown) => d._id === datasetId);
            if (selectedDataset) {
              setCurrentDataset(selectedDataset);
              
              // Set default column based on column types
              const numericColumn = selectedDataset.columns.find((col: unknown) => col.type === 'numeric');
              if (numericColumn) setSelectedColumn(numericColumn.name);
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
      } catch (error: unknown) {
        setError(error.message || 'An error occurred while fetching datasets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, [datasetId]);

  useEffect(() => {
    if (currentDataset && selectedColumn) {
      generateChartData();
    }
  }, [currentDataset, selectedColumn, binCount]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset column selection
      setSelectedColumn('');
      
      // Set default column based on column types
      const numericColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      if (numericColumn) setSelectedColumn(numericColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedColumn) return;

    const columnType = currentDataset.columns.find((col: unknown) => col.name === selectedColumn)?.type;

    // For histograms, we need numeric data
    if (columnType !== 'numeric') {
      setError('Selected column must be numeric for histograms');
      setChartData(null);
      return;
    }

    // Extract numeric values
    const numericValues = currentDataset.data
      .map((item: unknown) => parseFloat(item[selectedColumn]))
      .filter((value: number) => !isNaN(value));

    if (numericValues.length === 0) {
      setError('No valid numeric data found in the selected column');
      setChartData(null);
      return;
    }

    // Calculate min and max values
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);
    
    // Calculate bin width
    const binWidth = (maxValue - minValue) / binCount;
    
    // Create bins
    const bins = Array(binCount).fill(0).map((_, i) => ({
      start: minValue + i * binWidth,
      end: minValue + (i + 1) * binWidth,
      count: 0,
    }));
    
    // Count values in each bin
    numericValues.forEach((value: number) => {
      const binIndex = Math.min(
        Math.floor((value - minValue) / binWidth),
        binCount - 1
      );
      bins[binIndex].count++;
    });
    
    // Generate labels and data
    const labels = bins.map(bin => `${bin.start.toFixed(2)} - ${bin.end.toFixed(2)}`);
    const data = bins.map(bin => bin.count);

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
          label: `Frequency of ${selectedColumn}`,
          data,
          backgroundColor,
          borderColor,
          borderWidth: 1,
          barPercentage: 1,
          categoryPercentage: 1,
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
          <h1 className="text-3xl font-bold text-gray-900">Histogram</h1>
          <p className="mt-2 text-gray-600">Visualize the distribution of your data with histograms.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Histogram</h1>
            <p className="mt-2 text-gray-600">Visualize the distribution of your data with histograms.</p>
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
              <label htmlFor="column-select" className="block text-sm font-medium text-gray-700">
                Select Column (Numeric)
              </label>
              <select
                id="column-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
              >
                <option value="">Select Column</option>
                {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
                  <option key={column.name} value={column.name}>
                    {column.name} (numeric)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bin-count" className="block text-sm font-medium text-gray-700">
                Number of Bins
              </label>
              <input
                id="bin-count"
                type="number"
                min="2"
                max="50"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={binCount}
                onChange={(e) => setBinCount(Math.max(2, Math.min(50, parseInt(e.target.value) || 10)))}
              />
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
              <Bar 
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
                      text: `Distribution of ${selectedColumn}`,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Frequency',
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: selectedColumn,
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {!selectedColumn
                  ? 'Select a numeric column to generate a histogram'
                  : 'No data available for the selected column'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
