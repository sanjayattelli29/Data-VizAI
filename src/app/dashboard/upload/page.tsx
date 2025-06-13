'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpTrayIcon, XMarkIcon, DocumentChartBarIcon, CpuChipIcon, BeakerIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';

export default function UploadDataset() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    
    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'csv') {
      setError('Only CSV files are supported at the moment.');
      return;
    }

    setFile(file);
    setFileName(file.name);
    setDatasetName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for dataset name
    setError('');

    // Parse CSV for preview
    Papa.parse(file, {
      header: true,
      preview: 5, // Preview first 5 rows
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setPreviewData(results.data);
          if (results.meta.fields) {
            setColumns(results.meta.fields);
          }
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const clearFile = () => {
    setFile(null);
    setFileName('');
    setPreviewData(null);
    setColumns([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!datasetName.trim()) {
      setError('Please provide a name for your dataset.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Parse the entire CSV file
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          if (results.data && results.data.length > 0) {
            // Determine column types
            const columnTypes = determineColumnTypes(results.data, results.meta.fields || []);
            
            // Create the dataset object
            const dataset = {
              name: datasetName,
              columns: results.meta.fields?.map(field => ({
                name: field,
                type: columnTypes[field]
              })) || [],
              data: results.data
            };

            // Upload to API
            const response = await fetch('/api/datasets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(dataset),
            });

            if (response.ok) {
              router.push('/dashboard/data-table');
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to upload dataset');
            }
          }
        },
        error: (error) => {
          throw new Error(`Error parsing CSV: ${error.message}`);
        }
      });
    } catch (error: unknown) {
      setError(error.message || 'An error occurred while uploading the dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  // Function to determine column types (text, numeric, or mixed)
  const determineColumnTypes = (data: unknown[], columns: string[]) => {
    const columnTypes: Record<string, 'text' | 'numeric' | 'mixed'> = {};

    columns.forEach(column => {
      const isNumeric = true;
      const isText = true;

      // Check first 100 rows or all rows if less than 100
      const sampleSize = Math.min(data.length, 100);
      for (const i = 0; i < sampleSize; i++) {
        const value = data[i][column];
        
        // Skip empty values
        if (value === undefined || value === null || value === '') continue;
        
        // Check if value is numeric
        const isValueNumeric = !isNaN(Number(value)) && value.toString().trim() !== '';
        
        if (!isValueNumeric) {
          isNumeric = false;
        }
        
        // If we've found both numeric and non-numeric values, it's mixed
        if (!isNumeric && !isText) {
          columnTypes[column] = 'mixed';
          break;
        }
      }

      // Determine final type
      if (isNumeric) {
        columnTypes[column] = 'numeric';
      } else if (isText) {
        columnTypes[column] = 'text';
      } else {
        columnTypes[column] = 'mixed';
      }
    });

    return columnTypes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <DocumentChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Smart Data Analyser
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <span className="font-medium">powered by</span>
                    <div className="flex items-center space-x-1">
                      <CpuChipIcon className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-blue-600">AI Agents</span>
                    </div>
                    <span className="text-slate-400">&</span>
                    <div className="flex items-center space-x-1">
                      <BeakerIcon className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold text-indigo-600">Deep Learning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">Upload Your Dataset</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Transform your raw data into actionable insights with our advanced AI-powered analytics platform. 
            Upload your CSV file to begin intelligent data exploration and visualization.
          </p>
          <div className="mt-6 flex justify-center space-x-6 text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Automated Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Smart Insights</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Real-time Processing</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              {!file ? (
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/30 group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-300">
                      <ArrowUpTrayIcon className="h-16 w-16 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex text-lg leading-6 text-slate-700">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <span>Choose your CSV file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".csv"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                          />
                        </label>
                      </div>
                      <p className="text-slate-500 text-lg">or drag and drop it here</p>
                    </div>
                    <div className="bg-slate-100 rounded-lg px-4 py-2">
                      <p className="text-sm text-slate-600 font-medium">Supported format: CSV files only</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* File Info Card */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                          <DocumentChartBarIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-800">{fileName}</p>
                          <p className="text-sm text-slate-600">{(file.size / 1024).toFixed(2)} KB • CSV Format</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                        onClick={clearFile}
                      >
                        <span className="sr-only">Remove file</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Dataset Name Input */}
                  <div className="space-y-3">
                    <label htmlFor="dataset-name" className="block text-lg font-semibold leading-6 text-slate-800">
                      Dataset Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="dataset-name"
                        id="dataset-name"
                        className="block w-full rounded-xl border-0 py-4 px-4 text-slate-800 text-lg shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
                        placeholder="Enter a descriptive name for your dataset"
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Data Preview */}
                  {previewData && columns.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-slate-800">Data Preview</h3>
                        <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                          {columns.length} columns detected
                        </div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/80">
                              <tr>
                                {columns.map((column) => (
                                  <th
                                    key={column}
                                    scope="col"
                                    className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {previewData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors duration-150">
                                  {columns.map((column) => (
                                    <td
                                      key={`${rowIndex}-${column}`}
                                      className="px-6 py-4 text-sm text-slate-600 font-mono"
                                    >
                                      {row[column] || <span className="text-slate-400 italic">empty</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-200">
                          <p className="text-sm text-slate-500">
                            Showing first {previewData.length} rows • AI analysis will process complete dataset
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <button
                      type="button"
                      className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all duration-200"
                      onClick={clearFile}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
                        isUploading 
                          ? 'bg-slate-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      }`}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        'Start AI Analysis'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CpuChipIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">AI-Powered Analysis</h3>
            <p className="text-slate-600 text-sm">Advanced machine learning algorithms automatically detect patterns and anomalies in your data.</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BeakerIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Deep Learning Insights</h3>
            <p className="text-slate-600 text-sm">Neural networks provide sophisticated statistical analysis and predictive modeling capabilities.</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <DocumentChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Interactive Visualizations</h3>
            <p className="text-slate-600 text-sm">Dynamic charts and graphs help you understand complex data relationships at a glance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}