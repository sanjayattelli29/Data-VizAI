'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { captureAndUploadChart, saveUploadHistory } from '@/utils/chartUploader';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function BarCharts() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  const { data: session } = useSession();
  const chartRef = useRef<any>(null);
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedXAxis, setSelectedXAxis] = useState<string>('');
  const [selectedYAxis, setSelectedYAxis] = useState<string>('');
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);

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
              
              // Set default X and Y axes based on column types
              const textColumn = selectedDataset.columns.find((col: unknown) => col.type === 'text');
              const numericColumn = selectedDataset.columns.find((col: unknown) => col.type === 'numeric');
              
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
      } catch (error: unknown) {
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
      const textColumn = selected.columns.find((col: unknown) => col.type === 'text');
      const numericColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      
      if (textColumn) setSelectedXAxis(textColumn.name);
      if (numericColumn) setSelectedYAxis(numericColumn.name);
    }
  };

  const saveChart = async () => {
    if (!session?.user?.id || !currentDataset || !chartData) {
      setError('You must be logged in and have a chart generated to save it');
      return;
    }

    try {
      setIsSaving(true);
      setSavedToCloud(false);
      
      // Upload chart to Cloudinary
      const uploadResult = await captureAndUploadChart(
        chartRef,
        'bar-chart',
        session.user.id
      );
      
      if (!uploadResult) {
        throw new Error('Failed to upload chart to Cloudinary');
      }
      
      // Calculate basic metrics for the dataset
      const metrics = {
        Dataset_Size: currentDataset.data.length,
        Column_Count: currentDataset.columns.length,
        Numeric_Columns: currentDataset.columns.filter((col: unknown) => col.type === 'numeric').length,
        Text_Columns: currentDataset.columns.filter((col: unknown) => col.type === 'text').length,
        Date_Created: new Date().toISOString(),
        Chart_Type: 'Bar Chart',
        X_Axis: selectedXAxis,
        Y_Axis: selectedYAxis
      };
      
      // Save to database
      const saveResult = await saveUploadHistory(
        session.user.id,
        currentDataset._id,
        currentDataset.name,
        metrics,
        [{
          type: 'bar-chart',
          url: uploadResult.url,
          publicId: uploadResult.publicId
        }]
      );
      
      if (saveResult.success) {
        setSavedToCloud(true);
      } else {
        throw new Error(saveResult.message);
      }
    } catch (error: unknown) {
      console.error('Error saving chart:', error);
      setError(error.message || 'Failed to save chart');
    } finally {
      setIsSaving(false);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedXAxis || !selectedYAxis) return;

    const xAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedXAxis)?.type;
    const yAxisType = currentDataset.columns.find((col: unknown) => col.name === selectedYAxis)?.type;

    // For bar charts, X-axis should be categorical (text) and Y-axis should be numeric
    if (yAxisType !== 'numeric') {
      setError('Y-axis must be a numeric column for bar charts');
      setChartData(null);
      return;
    }

    // Group data by X-axis values and calculate aggregate Y-axis values
    const groupedData: Record<string, number[]> = {};
    
    currentDataset.data.forEach((item: unknown) => {
      const xValue = item[selectedXAxis]?.toString() || 'Undefined';
      const yValue = parseFloat(item[selectedYAxis]);
      
      if (!isNaN(yValue)) {
        if (!groupedData[xValue]) {
          groupedData[xValue] = [];
        }
        groupedData[xValue].push(yValue);
      }
    });

    // Calculate average for each group
    const labels = Object.keys(groupedData);
    const data = labels.map(label => {
      const values = groupedData[label];
      const sum = values.reduce((acc, val) => acc + val, 0);
      return sum / values.length; // Average
    });

    // Generate random color
    const backgroundColor = labels.map(() => 
      `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.6)`
    );

    setChartData({
      labels,
      datasets: [
        {
          label: `Average ${selectedYAxis} by ${selectedXAxis}`,
          data,
          backgroundColor,
          borderColor: backgroundColor.map(color => color.replace('0.6', '1')),
          borderWidth: 1,
        },
      ],
    });

    setError('');
    setSavedToCloud(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Bar Charts</h1>
          <p className="mt-2 text-gray-600">Visualize your data with bar charts.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Bar Charts</h1>
            <p className="mt-2 text-gray-600">Visualize your data with bar charts.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-700 mb-2">
                Dataset
              </label>
              <select
                id="dataset-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md font-medium text-gray-900"
                value={currentDataset?._id || ''}
                onChange={handleDatasetChange}
              >
                {datasets.map((dataset) => (
                  <option key={dataset._id} value={dataset._id} className="font-medium text-gray-900">
                    {dataset.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="x-axis-select" className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis (Categories)
              </label>
              <select
                id="x-axis-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md font-medium text-gray-900"
                value={selectedXAxis}
                onChange={(e) => setSelectedXAxis(e.target.value)}
              >
                <option value="" className="font-medium text-gray-900">Select X-Axis</option>
                {currentDataset?.columns
                  .filter((col: unknown) => col.type === 'text' || col.type === 'mixed')
                  .map((col: unknown) => (
                    <option key={col.name} value={col.name} className="font-medium text-gray-900">
                      {col.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="y-axis-select" className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis (Values)
              </label>
              <select
                id="y-axis-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md font-medium text-gray-900"
                value={selectedYAxis}
                onChange={(e) => setSelectedYAxis(e.target.value)}
              >
                <option value="" className="font-medium text-gray-900">Select Y-Axis</option>
                {currentDataset?.columns
                  .filter((col: unknown) => col.type === 'numeric')
                  .map((col: unknown) => (
                    <option key={col.name} value={col.name} className="font-medium text-gray-900">
                      {col.name}
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
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{`${selectedYAxis} by ${selectedXAxis}`}</h3>
                {session?.user && (
                  <button
                    onClick={saveChart}
                    disabled={isSaving || savedToCloud}
                    className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm ${savedToCloud ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                  >
                    <CloudArrowUpIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : savedToCloud ? 'Saved to Cloud' : 'Save to Cloud'}
                  </button>
                )}
              </div>
              <div className="h-96">
                <Bar 
                  data={chartData} 
                  ref={chartRef}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
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
                        text: `${selectedYAxis} by ${selectedXAxis}`,
                        font: {
                          weight: 'bold',
                          size: 16
                        },
                        color: '#111827' // text-gray-900
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: selectedYAxis,
                          font: {
                            weight: 'bold',
                            size: 14
                          },
                          color: '#111827' // text-gray-900
                        },
                        ticks: {
                          font: {
                            weight: 'bold',
                            size: 12
                          },
                          color: '#111827' // text-gray-900
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: selectedXAxis,
                          font: {
                            weight: 'bold',
                            size: 14
                          },
                          color: '#111827' // text-gray-900
                        },
                        ticks: {
                          font: {
                            weight: 'bold',
                            size: 12
                          },
                          color: '#111827' // text-gray-900
                        }
                      }
                    }
                  }}
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              {savedToCloud && (
                <p className="mt-2 text-sm text-green-600">Chart saved successfully! You can view it in your profile.</p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {!selectedXAxis || !selectedYAxis
                  ? 'Select X and Y axes to generate a bar chart'
                  : 'No data available for the selected axes'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
