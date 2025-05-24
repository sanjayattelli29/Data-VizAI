'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { getAllMetrics, saveMetricsToDatabase, QualityMetric, Dataset } from '@/utils/dataQualityMetrics';
import { Dataset as DatasetType } from '@/utils/dataQualityMetrics/types';
import { Tooltip } from '@/components/ui/tooltip/index';
import { toast } from '@/components/ui/toast/index';

// Define additional types
interface DatasetWithId {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, any>[];
}

export default function QualityMetrics() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  const { data: session } = useSession();
  
  const [datasets, setDatasets] = useState<DatasetWithId[]>([]);
  const [currentDataset, setCurrentDataset] = useState<DatasetWithId | null>(null);
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [metricsSaved, setMetricsSaved] = useState(false);

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
              await generateMetrics(selectedDataset);
            } else {
              // If the dataset with the provided ID is not found, load the first dataset
              setCurrentDataset(data[0]);
              await generateMetrics(data[0]);
            }
          } else if (data.length > 0) {
            // If no dataset ID is provided, load the first dataset
            setCurrentDataset(data[0]);
            await generateMetrics(data[0]);
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

  const handleDatasetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      await generateMetrics(selected);
    }
  };

  // Helper function to adapt between different Dataset types
  const adaptDatasetForMetrics = (dataset: DatasetWithId): DatasetType => {
    return {
      _id: dataset._id,
      name: dataset.name,
      columns: dataset.columns.map(col => ({
        name: col.name,
        type: col.type
      })),
      data: dataset.data
    };
  };

  const generateMetrics = async (dataset: DatasetWithId) => {
    if (!dataset) return;
    
    try {
      setIsLoading(true);
      setMetricsSaved(false);
      
      // Convert the dataset to the format expected by our metrics calculation functions
      const formattedDataset = adaptDatasetForMetrics(dataset);
      
      // Use our new implementation to calculate all metrics
      const calculatedMetrics = getAllMetrics(formattedDataset);
      setMetrics(calculatedMetrics);
      
      // Save metrics to MongoDB if user is authenticated
      if (session?.user?.id) {
        await saveMetricsToMongoDB(dataset._id, calculatedMetrics);
      }
    } catch (error) {
      console.error('Error generating metrics:', error);
      setError('Failed to generate metrics. Please try again.');
      toast.error('Failed to generate metrics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveMetricsToMongoDB = async (datasetId: string, calculatedMetrics: QualityMetric[]) => {
    if (!session?.user?.id) return;
    
    try {
      setIsSaving(true);
      
      // Convert metrics array to record for easier access
      const metricsRecord: Record<string, any> = {};
      calculatedMetrics.forEach(metric => {
        metricsRecord[metric.name] = metric.value;
      });
      
      // Save metrics to MongoDB
      const result = await saveMetricsToDatabase(
        session.user.id,
        datasetId,
        metricsRecord
      );
      
      if (result.success) {
        setMetricsSaved(true);
        toast.success('Metrics saved successfully');
      } else {
        toast.error('Failed to save metrics: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast.error('Failed to save metrics to database');
    } finally {
      setIsSaving(false);
    }
  };

  const filterMetricsByCategory = (category: string) => {
    if (category === 'all') {
      return metrics;
    }
    return metrics.filter(metric => metric.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <Link href="/dashboard" className="text-blue-500 hover:underline flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Quality Metrics</h1>
          <p className="text-gray-500">Analyze the quality of your dataset</p>
        </div>
        <Link href="/dashboard" className="text-blue-500 hover:underline flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
      </div>
      
      {datasets.length > 0 ? (
        <div>
          <div className="mb-6">
            <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Dataset
            </label>
            <select
              id="dataset-select"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
          
          {currentDataset && (
            <div>
              <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-2">{currentDataset.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded shadow">
                    <p className="text-sm text-gray-500">Rows</p>
                    <p className="text-xl font-bold">{currentDataset.data.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded shadow">
                    <p className="text-sm text-gray-500">Columns</p>
                    <p className="text-xl font-bold">{currentDataset.columns.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded shadow">
                    <p className="text-sm text-gray-500">Data Quality Score</p>
                    <p className="text-xl font-bold">
                      {metrics.find(m => m.name === 'Data_Quality_Score')?.value || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                  <button
                    className={`px-4 py-2 rounded-md ${activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    All Metrics
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${activeTab === 'data_structure' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('data_structure')}
                  >
                    Structure
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${activeTab === 'data_quality' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('data_quality')}
                  >
                    Quality
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${activeTab === 'statistical' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('statistical')}
                  >
                    Statistical
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${activeTab === 'advanced' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActiveTab('advanced')}
                  >
                    Advanced
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Metric
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filterMetricsByCategory(activeTab).map((metric, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              {metric.name.replace(/_/g, ' ')}
                              <Tooltip content={metric.description}>
                                <InformationCircleIcon className="h-4 w-4 ml-1 text-gray-400" />
                              </Tooltip>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {typeof metric.value === 'number' && !isNaN(metric.value) 
                              ? metric.value.toLocaleString(undefined, { 
                                  maximumFractionDigits: 2,
                                  minimumFractionDigits: 0
                                })
                              : metric.value}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {metric.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {session?.user && (
                <div className="mt-6 flex justify-end">
                  <button
                    className={`px-4 py-2 rounded-md ${metricsSaved ? 'bg-green-500' : 'bg-blue-500'} text-white ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => saveMetricsToMongoDB(currentDataset._id, metrics)}
                    disabled={isSaving || metricsSaved}
                  >
                    {isSaving ? 'Saving...' : metricsSaved ? 'Metrics Saved' : 'Save Metrics'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No datasets found. Please upload a dataset first.</p>
          <Link href="/dashboard/upload" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Upload Dataset
          </Link>
        </div>
      )}
    </div>
  );
}
