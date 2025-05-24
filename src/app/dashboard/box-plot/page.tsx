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

// Function to calculate quartiles and other statistics for box plot
function calculateBoxPlotData(data: number[]) {
  if (data.length === 0) return null;
  
  // Sort the data
  const sortedData = [...data].sort((a, b) => a - b);
  
  // Calculate min, max, and quartiles
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  
  // Calculate median (Q2)
  const medianIndex = Math.floor(sortedData.length / 2);
  const median = sortedData.length % 2 === 0
    ? (sortedData[medianIndex - 1] + sortedData[medianIndex]) / 2
    : sortedData[medianIndex];
  
  // Calculate Q1 (first quartile)
  const q1Index = Math.floor(sortedData.length / 4);
  const q1 = sortedData.length % 4 === 0
    ? (sortedData[q1Index - 1] + sortedData[q1Index]) / 2
    : sortedData[q1Index];
  
  // Calculate Q3 (third quartile)
  const q3Index = Math.floor(sortedData.length * 3 / 4);
  const q3 = sortedData.length % 4 === 0
    ? (sortedData[q3Index - 1] + sortedData[q3Index]) / 2
    : sortedData[q3Index];
  
  // Calculate IQR (Interquartile Range)
  const iqr = q3 - q1;
  
  // Calculate whiskers (typically 1.5 * IQR from the box)
  const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
  const upperWhisker = Math.min(max, q3 + 1.5 * iqr);
  
  // Identify outliers
  const outliers = sortedData.filter(value => value < lowerWhisker || value > upperWhisker);
  
  return {
    min,
    q1,
    median,
    q3,
    max,
    lowerWhisker,
    upperWhisker,
    outliers
  };
}

export default function BoxPlot() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  
  const [datasets, setDatasets] = useState<any[]>([]);
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
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
              
              // Set default column based on column types
              const numericColumn = selectedDataset.columns.find((col: any) => col.type === 'numeric');
              const categoryColumn = selectedDataset.columns.find((col: any) => col.type === 'text');
              
              if (numericColumn) setSelectedColumn(numericColumn.name);
              if (categoryColumn) setSelectedCategory(categoryColumn.name);
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
    if (currentDataset && selectedColumn) {
      generateChartData();
    }
  }, [currentDataset, selectedColumn, selectedCategory]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      
      // Reset column selections
      setSelectedColumn('');
      setSelectedCategory('');
      
      // Set default columns based on column types
      const numericColumn = selected.columns.find((col: any) => col.type === 'numeric');
      const categoryColumn = selected.columns.find((col: any) => col.type === 'text');
      
      if (numericColumn) setSelectedColumn(numericColumn.name);
      if (categoryColumn) setSelectedCategory(categoryColumn.name);
    }
  };

  const generateChartData = () => {
    if (!currentDataset || !selectedColumn) return;

    const columnType = currentDataset.columns.find((col: any) => col.name === selectedColumn)?.type;

    // For box plots, we need numeric data
    if (columnType !== 'numeric') {
      setError('Selected column must be numeric for box plots');
      setChartData(null);
      return;
    }

    let boxPlotData;
    let labels: string[] = [];
    
    if (selectedCategory) {
      // Group data by category
      const categoryGroups: Record<string, number[]> = {};
      
      currentDataset.data.forEach((item: any) => {
        const categoryValue = item[selectedCategory];
        const numericValue = parseFloat(item[selectedColumn]);
        
        if (!isNaN(numericValue)) {
          if (!categoryGroups[categoryValue]) {
            categoryGroups[categoryValue] = [];
          }
          categoryGroups[categoryValue].push(numericValue);
        }
      });
      
      // Calculate box plot data for each category
      const categories = Object.keys(categoryGroups);
      const boxPlotStats = categories.map(category => {
        return {
          category,
          stats: calculateBoxPlotData(categoryGroups[category])
        };
      }).filter(item => item.stats !== null);
      
      if (boxPlotStats.length === 0) {
        setError('No valid numeric data found for the selected columns');
        setChartData(null);
        return;
      }
      
      labels = boxPlotStats.map(item => item.category);
      
      // Prepare data for Chart.js
      // Since Chart.js doesn't have a built-in box plot type, we'll simulate it with a bar chart
      boxPlotData = {
        labels,
        datasets: [
          // Min to Q1 (lower whisker)
          {
            label: 'Lower Whisker',
            data: boxPlotStats.map(item => item.stats!.lowerWhisker - item.stats!.min),
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 1,
            base: boxPlotStats.map(item => item.stats!.min),
          },
          // Q1 to Median
          {
            label: 'Q1 to Median',
            data: boxPlotStats.map(item => item.stats!.median - item.stats!.q1),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            base: boxPlotStats.map(item => item.stats!.q1),
          },
          // Median to Q3
          {
            label: 'Median to Q3',
            data: boxPlotStats.map(item => item.stats!.q3 - item.stats!.median),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            base: boxPlotStats.map(item => item.stats!.median),
          },
          // Q3 to Upper Whisker
          {
            label: 'Upper Whisker',
            data: boxPlotStats.map(item => item.stats!.upperWhisker - item.stats!.q3),
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 1,
            base: boxPlotStats.map(item => item.stats!.q3),
          },
        ],
      };
    } else {
      // Single box plot for the entire dataset
      const numericValues = currentDataset.data
        .map((item: any) => parseFloat(item[selectedColumn]))
        .filter((value: number) => !isNaN(value));
      
      if (numericValues.length === 0) {
        setError('No valid numeric data found in the selected column');
        setChartData(null);
        return;
      }
      
      const stats = calculateBoxPlotData(numericValues);
      if (!stats) {
        setError('Could not calculate statistics for the selected data');
        setChartData(null);
        return;
      }
      
      labels = [selectedColumn];
      
      // Prepare data for Chart.js
      boxPlotData = {
        labels,
        datasets: [
          // Min to Q1 (lower whisker)
          {
            label: 'Lower Whisker',
            data: [stats.lowerWhisker - stats.min],
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 1,
            base: [stats.min],
          },
          // Q1 to Median
          {
            label: 'Q1 to Median',
            data: [stats.median - stats.q1],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            base: [stats.q1],
          },
          // Median to Q3
          {
            label: 'Median to Q3',
            data: [stats.q3 - stats.median],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            base: [stats.median],
          },
          // Q3 to Upper Whisker
          {
            label: 'Upper Whisker',
            data: [stats.upperWhisker - stats.q3],
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 1,
            base: [stats.q3],
          },
        ],
      };
    }

    setChartData(boxPlotData);
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
          <h1 className="text-3xl font-bold text-gray-900">Box Plot</h1>
          <p className="mt-2 text-gray-600">Visualize the distribution of your data with box plots.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Box Plot</h1>
            <p className="mt-2 text-gray-600">Visualize the distribution of your data with box plots.</p>
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
                {currentDataset?.columns?.filter((column: any) => column.type === 'numeric').map((column: any) => (
                  <option key={column.name} value={column.name}>
                    {column.name} (numeric)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700">
                Group By (Optional)
              </label>
              <select
                id="category-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">No Grouping</option>
                {currentDataset?.columns?.filter((column: any) => column.type === 'text').map((column: any) => (
                  <option key={column.name} value={column.name}>
                    {column.name} (text)
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
                      text: selectedCategory 
                        ? `Box Plot of ${selectedColumn} by ${selectedCategory}`
                        : `Box Plot of ${selectedColumn}`,
                    },
                    tooltip: {
                      callbacks: {
                        title: (tooltipItems) => {
                          return tooltipItems[0].dataset.label || '';
                        },
                        label: (tooltipItem) => {
                          return `Value: ${tooltipItem.raw}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      title: {
                        display: true,
                        text: selectedColumn,
                      },
                      stacked: true
                    },
                    x: {
                      title: {
                        display: true,
                        text: selectedCategory || 'Dataset',
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
                  ? 'Select a numeric column to generate a box plot'
                  : 'No data available for the selected column'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
