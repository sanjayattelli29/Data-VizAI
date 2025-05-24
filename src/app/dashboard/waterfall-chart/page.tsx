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

export default function WaterfallChart() {
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
            const selectedDataset = data.find((d: unknown) => d._id === datasetId);
            if (selectedDataset) {
              setCurrentDataset(selectedDataset);
              
              // Set default columns based on column types
              const categoryColumn = selectedDataset.columns.find((col: unknown) => col.type === 'text');
              const valueColumn = selectedDataset.columns.find((col: unknown) => col.type === 'numeric');
              
              if (categoryColumn) setSelectedCategory(categoryColumn.name);
              if (valueColumn) setSelectedValue(valueColumn.name);
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
    if (currentDataset && selectedCategory && selectedValue) {
      generateChartData();
    }
  }, [currentDataset, selectedCategory, selectedValue]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset column selections
      setSelectedCategory('');
      setSelectedValue('');
      
      // Set default columns based on column types
      const categoryColumn = selected.columns.find((col: unknown) => col.type === 'text');
      const valueColumn = selected.columns.find((col: unknown) => col.type === 'numeric');
      
      if (categoryColumn) setSelectedCategory(categoryColumn.name);
      if (valueColumn) setSelectedValue(valueColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedCategory || !selectedValue) return;

    const categoryType = currentDataset.columns.find((col: unknown) => col.name === selectedCategory)?.type;
    const valueType = currentDataset.columns.find((col: unknown) => col.name === selectedValue)?.type;

    // For waterfall charts, category should be text and value should be numeric
    if (categoryType !== 'text' || valueType !== 'numeric') {
      setError('Category must be a text column and Value must be a numeric column for waterfall charts');
      setChartData(null);
      return;
    }

    // Extract categories and values
    const data = currentDataset.data.map((item: unknown) => ({
      category: item[selectedCategory],
      value: parseFloat(item[selectedValue])
    })).filter((item: unknown) => !isNaN(item.value));

    if (data.length === 0) {
      setError('No valid data found for the selected columns');
      setChartData(null);
      return;
    }

    // Sort data by value to make the waterfall more meaningful
    data.sort((a: unknown, b: unknown) => a.value - b.value);

    // Add a "Total" category at the end
    const total = data.reduce((sum: number, item: unknown) => sum + item.value, 0);
    data.push({ category: 'Total', value: total });

    // Calculate running total for the waterfall effect
    const runningTotal = 0;
    const waterfallData = data.map((item: unknown, index: number) => {
      const isTotal = index === data.length - 1;
      const result = {
        category: item.category,
        value: isTotal ? total : item.value,
        start: isTotal ? 0 : runningTotal,
        end: isTotal ? total : runningTotal + item.value,
        isTotal
      };
      
      if (!isTotal) {
        runningTotal += item.value;
      }
      
      return result;
    });

    // Prepare data for Chart.js
    const labels = waterfallData.map((item: unknown) => item.category);
    
    // Generate colors based on positive/negative values or total
    const backgroundColor = waterfallData.map((item: unknown) => {
      if (item.isTotal) return 'rgba(75, 192, 192, 0.6)'; // Total
      return item.value >= 0 ? 'rgba(54, 162, 235, 0.6)' : 'rgba(255, 99, 132, 0.6)'; // Positive or negative
    });
    
    const borderColor = waterfallData.map((item: unknown) => {
      if (item.isTotal) return 'rgba(75, 192, 192, 1)'; // Total
      return item.value >= 0 ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)'; // Positive or negative
    });

    setChartData({
      labels,
      datasets: [
        {
          label: 'Waterfall',
          data: waterfallData.map((item: unknown) => item.isTotal ? item.value : item.value),
          backgroundColor,
          borderColor,
          borderWidth: 1,
          // Custom properties for the waterfall plugin
          start: waterfallData.map((item: unknown) => item.start),
          isTotal: waterfallData.map((item: unknown) => item.isTotal),
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
          <h1 className="text-3xl font-bold text-gray-900">Waterfall Chart</h1>
          <p className="mt-2 text-gray-600">Visualize cumulative effect of sequential positive and negative values.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Waterfall Chart</h1>
            <p className="mt-2 text-gray-600">Visualize cumulative effect of sequential positive and negative values.</p>
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
                {currentDataset?.columns?.filter((column: unknown) => column.type === 'text').map((column: unknown) => (
                  <option key={column.name} value={column.name}>
                    {column.name} (text)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="value-select" className="block text-sm font-medium text-gray-700">
                Value Column (Numeric)
              </label>
              <select
                id="value-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
              >
                <option value="">Select Value</option>
                {currentDataset?.columns?.filter((column: unknown) => column.type === 'numeric').map((column: unknown) => (
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
              <Bar 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    title: {
                      display: true,
                      text: `Waterfall Chart of ${selectedValue} by ${selectedCategory}`,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const index = context.dataIndex;
                          const dataset = context.dataset;
                          const isTotal = (dataset as any).isTotal[index];
                          const value = context.parsed.y;
                          
                          if (isTotal) {
                            return `Total: ${value}`;
                          } else {
                            const start = (dataset as any).start[index];
                            return [
                              `Value: ${value}`,
                              `Start: ${start}`,
                              `End: ${start + value}`
                            ];
                          }
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: selectedValue,
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: selectedCategory,
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {!selectedCategory || !selectedValue
                  ? 'Select Category and Value columns to generate a waterfall chart'
                  : 'No data available for the selected columns'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
