'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
    } catch (error: any) {
      setError(error.message || 'An error occurred while uploading the dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  // Function to determine column types (text, numeric, or mixed)
  const determineColumnTypes = (data: any[], columns: string[]) => {
    const columnTypes: Record<string, 'text' | 'numeric' | 'mixed'> = {};

    columns.forEach(column => {
      let isNumeric = true;
      let isText = true;

      // Check first 100 rows or all rows if less than 100
      const sampleSize = Math.min(data.length, 100);
      for (let i = 0; i < sampleSize; i++) {
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Dataset</h1>
        <p className="mt-2 text-gray-600">
          Upload your CSV file to analyze and visualize your data.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          {!file ? (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex text-sm leading-6 text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                >
                  <span>Upload a file</span>
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
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs leading-5 text-gray-600">CSV files only</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowUpTrayIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{fileName}</p>
                    <p className="text-xs text-gray-500">{file.size} bytes</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-4 flex-shrink-0 rounded-md text-gray-400 hover:text-gray-500"
                  onClick={clearFile}
                >
                  <span className="sr-only">Remove file</span>
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div>
                <label htmlFor="dataset-name" className="block text-sm font-medium leading-6 text-gray-900">
                  Dataset Name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="dataset-name"
                    id="dataset-name"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {previewData && columns.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Data Preview</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          {columns.map((column) => (
                            <th
                              key={column}
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {columns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                              >
                                {row[column]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Showing first {previewData.length} rows of data</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 mr-3"
                  onClick={clearFile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Dataset'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
