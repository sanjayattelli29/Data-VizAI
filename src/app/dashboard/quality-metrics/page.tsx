'use client';

import { getAllMetrics, QualityMetric } from '@/utils/dataQualityMetrics';
import { Dataset as DatasetType } from '@/utils/dataQualityMetrics/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Define additional types
interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
}

interface MLAnalysisResult {
  overall_score: number;
  quality_label: string;
  label_probabilities: Record<string, number>;
  top_issues: Record<string, number>;
  metric_scores: Record<string, number>;
  prediction_time: string;
  metrics_capped?: Record<string, number>;
}

// At the top of the file, after imports
interface MetricStatus {
  label: string;
  color: string;
  emoji: string;
}

const getMetricStatus = (score: number): MetricStatus => {
  if (score >= 90) {
    return { label: 'Excellent', color: 'green', emoji: '🟢' };
  }
  if (score >= 70) {
    return { label: 'Good', color: 'blue', emoji: '🔵' };
  }
  if (score >= 50) {
    return { label: 'Moderate', color: 'yellow', emoji: '🟡' };
  }
  return { label: 'Poor', color: 'red', emoji: '🔴' };
};

// Helper function to convert Dataset to DatasetType
const adaptDatasetForMetrics = (dataset: Dataset): DatasetType => {
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

export default function QualityMetrics() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('id');
  const { data: session } = useSession();
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [metricsSaved, setMetricsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mlAnalysisResults, setMlAnalysisResults] = useState<MLAnalysisResult | null>(null);

  const generateMetrics = useCallback(async (dataset: Dataset) => {
    if (!dataset) return;
    
    try {
      setIsLoading(true);
      setMetricsSaved(false);
      
      const formattedDataset = adaptDatasetForMetrics(dataset);
      const calculatedMetrics = getAllMetrics(formattedDataset);
      setMetrics(calculatedMetrics);
      
      // Save metrics to MongoDB if user is authenticated
      if (session?.user?.id) {
        await saveMetricsToMongoDB(dataset._id, calculatedMetrics);
      }
    } catch (error) {
      console.error('Error generating metrics:', error);
      if (error instanceof Error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setError('Failed to generate metrics. Please try again.');
        toast.error('Failed to generate metrics. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data: Dataset[] = await response.json();
          setDatasets(data);
          
          // If a dataset ID is provided in the URL, load that dataset
          if (datasetId && data.length > 0) {
            const selectedDataset = data.find(d => d._id === datasetId);
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
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An error occurred while fetching datasets');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, [datasetId, generateMetrics]);

  const handleDatasetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      await generateMetrics(selected);
    }
  };

  const saveMetricsToMongoDB = async (datasetId: string, metrics: QualityMetric[]) => {
    if (!session?.user?.id) return;
    
    try {
      setIsSaving(true);
      
      const metricsRecord: Record<string, number | string> = {};
      metrics.forEach(metric => {
        metricsRecord[metric.name] = metric.value;
      });
      
      const response = await fetch('/api/metrics/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          datasetId,
          metrics: metricsRecord,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setMetricsSaved(true);
        toast.success('Metrics saved successfully');
      } else {
        throw new Error('Failed to save metrics');
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      if (error instanceof Error) {
        toast.error(`Failed to save metrics: ${error.message}`);
      } else {
        toast.error('Failed to save metrics');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filterMetricsByCategory = (category: string) => {
    if (category === 'all') {
      return metrics;
    }

    return metrics.filter(metric => {
      switch (category) {
        case 'data_structure':
          return metric.name.includes('Column') || 
                 metric.name.includes('Row') || 
                 metric.name.includes('Size');
        case 'data_quality':
          return metric.name.includes('Quality') || 
                 metric.name.includes('Missing') || 
                 metric.name.includes('Duplicate') || 
                 metric.name.includes('Outlier');
        case 'statistical':
          return metric.name.includes('Mean') || 
                 metric.name.includes('Distribution') || 
                 metric.name.includes('Correlation');
        case 'advanced':
          return metric.name.includes('Feature') || 
                 metric.name.includes('Label') || 
                 metric.name.includes('Class');
        default:
          return true;
      }
    });
  };

  const prepareMetricsForAnalysis = (metrics: QualityMetric[]) => {
    const metricsData: Record<string, number> = {
      Row_Count: 0,
      Column_Count: 0,
      File_Size_MB: 0,
      Numeric_Columns_Count: 0,
      Categorical_Columns_Count: 0,
      Date_Columns_Count: 0,
      Missing_Values_Pct: 0,
      Duplicate_Records_Count: 0,
      Outlier_Rate: 0,
      Inconsistency_Rate: 0,
      Data_Type_Mismatch_Rate: 0,
      Null_vs_NaN_Distribution: 0,
      Cardinality_Categorical: 0,
      Target_Imbalance: 0,
      Feature_Importance_Consistency: 0,
      Class_Overlap_Score: 0,
      Label_Noise_Rate: 0,
      Feature_Correlation_Mean: 0,
      Range_Violation_Rate: 0,
      Mean_Median_Drift: 0,
      Data_Freshness: 0,
      Anomaly_Count: 0,
      Encoding_Coverage_Rate: 0,
      Variance_Threshold_Check: 0,
      Data_Density_Completeness: 0,
      Domain_Constraint_Violations: 0
    };

    // Map our metrics to the expected format
    metrics.forEach(metric => {
      const value = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value;
      if (isNaN(value)) return;

      switch(metric.name) {
        case 'rowCount':
          metricsData.Row_Count = value;
          break;
        case 'columnCount':
          metricsData.Column_Count = value;
          break;
        case 'fileSize':
          metricsData.File_Size_MB = value;
          break;
        case 'numericColumnsCount':
          metricsData.Numeric_Columns_Count = value;
          break;
        case 'categoricalColumnsCount':
          metricsData.Categorical_Columns_Count = value;
          break;
        case 'dateColumnsCount':
          metricsData.Date_Columns_Count = value;
          break;
        case 'missingValuesPct':
          metricsData.Missing_Values_Pct = value;
          break;
        // Add more mappings based on your actual metric names
      }
    });

    return metricsData;
  };

  const performMLAnalysis = async () => {
    if (!currentDataset || !metrics.length) return;

    try {
      setIsAnalyzing(true);
      const metricsData = prepareMetricsForAnalysis(metrics);
      
      const response = await fetch('https://data-viz-ai-model.onrender.com/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metricsData),
      });

      if (!response.ok) {
        throw new Error('Failed to perform ML analysis');
      }

      const results = await response.json();
      setMlAnalysisResults(results);
      toast.success('ML Analysis completed successfully');
    } catch (error) {
      console.error('Error performing ML analysis:', error);
      toast.error('Failed to perform ML analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading quality metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" /> 
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Quality Metrics</h1>
            <p className="text-lg text-gray-600">Comprehensive analysis of your dataset quality</p>
          </div>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium shadow border border-gray-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" /> 
            Back to Dashboard
          </Link>
        </div>
        
        {datasets.length > 0 ? (
          <div className="space-y-8">
            {/* Dataset Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-900 mb-3">
                Select Dataset
              </label>
              <select
                id="dataset-select"
                className="block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
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
              <div className="space-y-8">
                {/* Dataset Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentDataset.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Total Rows</p>
                          <p className="text-3xl font-bold text-gray-900">{currentDataset.data.length.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 2 0 002 2h2a2 2 0 002-2V7m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Columns</p>
                          <p className="text-3xl font-bold text-gray-900">{currentDataset.columns.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <button
                        onClick={performMLAnalysis}
                        disabled={isAnalyzing}
                        className={`flex items-center justify-between w-full p-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg
                          ${isAnalyzing 
                            ? 'bg-gray-100 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
                          }`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-white/90 mb-1">Deep Learning Analysis</p>
                          <p className="text-lg font-bold text-white">
                            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          {isAnalyzing ? (
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Regular Metrics Section - Simple Display */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex space-x-1 overflow-x-auto pb-2">
                      {[
                        { key: 'all', label: 'All Metrics', icon: '📊' },
                        { key: 'data_structure', label: 'Structure', icon: '🏗️' },
                        { key: 'data_quality', label: 'Quality', icon: '✨' },
                        { key: 'statistical', label: 'Statistical', icon: '📈' },
                        { key: 'advanced', label: 'Advanced', icon: '🔬' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                            activeTab === tab.key 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          onClick={() => setActiveTab(tab.key)}
                        >
                          <span className="mr-2">{tab.icon}</span>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Simple Metrics Table */}
                  <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                              Metric Name
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {filterMetricsByCategory(activeTab).map((metric, index) => (
                            <tr 
                              key={index} 
                              className={`hover:bg-gray-50 transition-colors duration-150 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-gray-900">
                                  {metric.name.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {typeof metric.value === 'number' 
                                    ? metric.value.toFixed(1) 
                                    : metric.value}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Save and Analyze Buttons */}
                {session?.user && (
                  <div className="flex justify-end space-x-4">
                    <button
                      className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        metricsSaved 
                          ? 'bg-green-600 text-white shadow-md' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                      } ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
                      onClick={() => saveMetricsToMongoDB(currentDataset._id, metrics)}
                      disabled={isSaving || metricsSaved}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : metricsSaved ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Metrics Saved
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Save Metrics
                        </>
                      )}
                    </button>

                    <button
                      className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 
                        bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg
                        ${isAnalyzing ? 'opacity-75 cursor-not-allowed' : ''}`}
                      onClick={performMLAnalysis}
                      disabled={isAnalyzing || !metrics.length}
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h3m-1 4l-3-3m0 0l-3 3m3-3V4" />
                          </svg>
                          Perform ML Analysis
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ML Analysis Results - Detailed Display */}
                {mlAnalysisResults && (
                  <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">ML Analysis Results</h3>
                    
                    {/* Overall Score with Progress Bar */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Overall Quality Score</h4>
                        <div className="text-2xl font-bold text-blue-600">
                          {mlAnalysisResults.overall_score.toFixed(1)}/100
                        </div>
                      </div>
                      <div className="relative pt-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="h-4 rounded-full bg-blue-600"
                            style={{ width: `${mlAnalysisResults.overall_score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-2">
                          <span>Poor</span>
                          <span>Moderate</span>
                          <span>Good</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Score Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(mlAnalysisResults.metric_scores).map(([metric, score]) => (
                        <div key={metric} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {metric.replace(/_/g, ' ')}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {score.toFixed(1)}
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${score}%`,
                                backgroundColor: score >= 90 ? '#10B981' : 
                                              score >= 70 ? '#3B82F6' : 
                                              score >= 50 ? '#F59E0B' : 
                                              '#EF4444'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-3m-1 4l-3-3m0 0l-3 3m3-3V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Datasets Found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Get started by uploading your first dataset to analyze its quality metrics.
              </p>
              <Link 
                href="/dashboard/upload" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3V4" />
                </svg>
                Upload Dataset
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}