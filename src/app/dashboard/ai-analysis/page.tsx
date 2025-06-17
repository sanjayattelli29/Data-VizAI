'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

// Base interfaces
interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  isAIEnhanced?: boolean;
}

interface DataRange {
  start: number;
  end: number;
  isValid: boolean;
  errorMessage?: string;
  totalRows: number;
  isFullDataset: boolean;
  isSingleRow: boolean;
}

interface StatisticalResult {
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
  variance: number;
  q1: number;
  q3: number;
  mode: number;
  count: number;
  skewness: number;
  kurtosis: number;
  outliers?: number[];
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number;
  };
  normalityTest?: {
    statistic: number;
    isNormal: boolean;
  };
}

interface TextAnalysisResult {
  totalValues: number;
  uniqueCount: number;
  frequencies: Record<string, number>;
  mostCommon: Array<{ value: string; count: number }>;
  avgLength: number;
  minLength: number;
  maxLength: number;
  patterns: string[];
}

interface DistributionChange {
  skewnessChange: number;
  kurtosisChange: number;
  varianceRatio: number;
  description: string;
}

interface ComparisonResult {
  range1: DataRange;
  range2: DataRange;
  stats1: StatisticalResult;
  stats2: StatisticalResult;
  difference: number;
  percentageChange: number;
  distributionChange: DistributionChange;
}

interface MemoizedResult {
  stats: StatisticalResult;
  timestamp: number;
  rangeKey: string;
}

interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'text' | 'date';
  uniqueValues: number;
  nullCount: number;
  emptyCount: number;
  patterns?: string[];
}

interface RangeAnalysisContext {
  range?: DataRange;
  column?: string;
  operation?: 'average' | 'min' | 'max' | 'sum' | 'count' | 'analyze' | 'compare';
  groupBy?: string;
}

interface ConversationContext {
  lastQuery: string;
  lastColumn?: string;
  lastDataType?: 'numeric' | 'text' | 'date';
  selectedColumns?: string[];
}

// Enhanced interfaces for data quality and visualization
interface DataQualityAssessment {
  completeness: number;
  consistency: number;
  accuracy: number;
  duplicateCount: number;
  outlierCounts: Record<string, number>;
  suggestions: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
}

interface VisualizationRecommendation {
  chartType: string;
  confidence: number;
  reasoning: string;
  description: string;
  suitable_columns: string[];
}

// Constants and utility functions
const MEMO_EXPIRY = 5 * 60 * 1000; // 5 minutes
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const rowsPerPage = 20;

// T-distribution critical values for common confidence levels
const T_DISTRIBUTION_VALUES = {
  0.90: 1.645,
  0.95: 1.96,
  0.99: 2.576
} as const;

// Utility state
const memoizedResults = new Map<string, MemoizedResult>();

function getTScoreForConfidence(confidenceLevel: number): number {
  return T_DISTRIBUTION_VALUES[confidenceLevel as keyof typeof T_DISTRIBUTION_VALUES] || T_DISTRIBUTION_VALUES[0.95];
}

function shapiroWilkTest(data: number[]): { statistic: number; isNormal: boolean } {
  const n = data.length;
  if (n < 3) return { statistic: 1, isNormal: true };

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, val) => sum + val, 0) / n;
  
  const s2 = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const statistic = Math.min(0.99, Math.pow(1 - (s2 / ((n - 1) * Math.pow(mean, 2))), 0.5));
  
  return {
    statistic,
    isNormal: statistic > 0.9
  };
}

function pearsonCorrelation(data: Dataset['data'], col1: string, col2: string): number {
  const values1 = data.map(row => parseFloat(String(row[col1]))).filter(v => !isNaN(v));
  const values2 = data.map(row => parseFloat(String(row[col2]))).filter(v => !isNaN(v));
  
  const n = Math.min(values1.length, values2.length);
  if (n < 2) return 0;

  const mean1 = values1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = values2.reduce((sum, val) => sum + val, 0) / n;

  let num = 0, den1 = 0, den2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    num += diff1 * diff2;
    den1 += diff1 * diff1;
    den2 += diff2 * diff2;
  }

  return num / Math.sqrt(den1 * den2);
}

function calculateAdvancedStats(data: Dataset['data'], column: string, confidenceLevel = 0.95): StatisticalResult | null {
  const stats = calculateStats(data, column);
  if (!stats) return null;

  const values = data
    .map(row => typeof row[column] === 'number' ? row[column] : parseFloat(String(row[column])))
    .filter(val => !isNaN(val));

  const n = values.length;
  const tScore = getTScoreForConfidence(confidenceLevel);
  const marginOfError = tScore * (stats.stdDev / Math.sqrt(n));
  const normalityTest = shapiroWilkTest(values);

  return {
    ...stats,
    confidenceInterval: {
      lower: stats.avg - marginOfError,
      upper: stats.avg + marginOfError,
      level: confidenceLevel
    },
    normalityTest
  };
}

function calculateCorrelationMatrix(dataset: Dataset): { [key: string]: { [key: string]: number } } {
  const numericColumns = dataset.columns
    .filter(col => col.type === 'numeric')
    .map(col => col.name);

  const matrix: { [key: string]: { [key: string]: number } } = {};
  
  numericColumns.forEach(col1 => {
    matrix[col1] = {};
    numericColumns.forEach(col2 => {
      matrix[col1][col2] = pearsonCorrelation(dataset.data, col1, col2);
    });
  });

  return matrix;
}

// Helper function to call Groq API
const callGroqAPI = async (prompt: string): Promise<string | null> => {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });

    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Groq API error:', error);
    return null;
  }
};

// Calculate statistics for numeric columns
const calculateStats = (data: Dataset['data'], column: string): StatisticalResult | null => {
  const values = data
    .map(row => typeof row[column] === 'number' ? row[column] : parseFloat(String(row[column])))
    .filter(val => !isNaN(val));

  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Median
  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];

  // Quartiles
  const q1Index = Math.floor(values.length * 0.25);
  const q3Index = Math.floor(values.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];

  // Variance and standard deviation
  const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Mode (most frequent value)
  const frequencies: Record<number, number> = {};
  values.forEach(val => frequencies[val] = (frequencies[val] || 0) + 1);
  const mode = Number(Object.keys(frequencies).reduce((a, b) => frequencies[Number(a)] > frequencies[Number(b)] ? a : b));

  // Skewness and kurtosis
  const skewness = values.reduce((acc, val) => acc + Math.pow((val - avg) / stdDev, 3), 0) / values.length;
  const kurtosis = values.reduce((acc, val) => acc + Math.pow((val - avg) / stdDev, 4), 0) / values.length - 3;

  // Outliers (using IQR method)
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values.filter(val => val < lowerBound || val > upperBound);

  return {
    sum,
    avg,
    min,
    max,
    median,
    stdDev,
    variance,
    q1,
    q3,
    mode,
    count: values.length,
    skewness,
    kurtosis,
    outliers
  };
};

// Get column types
const getColumnTypes = (data: Dataset['data']) => {
  const sample = data[0] || {};
  const numeric: string[] = [];
  const text: string[] = [];
  const date: string[] = [];

  Object.keys(sample).forEach(key => {
    const sampleValues = data.slice(0, 10).map(row => row[key]);
    const numericCount = sampleValues.filter(val => !isNaN(Number(val))).length;
    
    if (numericCount > 7) {
      numeric.push(key);
    } else {
      text.push(key);
    }
  });

  return { numeric, text, date };
};


// Type-safe row preview formatting
const formatRowPreview = (row: Record<string, string | number>, maxLength: number = 100): string => {
  const entries = Object.entries(row);
  if (entries.length === 0) return '{}';

  const formatted = entries.map(([key, value]) => {
    const valueStr = typeof value === 'string' ? 
      `"${value.length > 30 ? value.slice(0, 27) + '...' : value}"` :
      String(value);
    return `${key}: ${valueStr}`;
  });

  let result = `{ ${formatted.join(', ')} }`;
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + '...';
  }
  return result;
};

const generateRowPreview = (
  data: Dataset['data'], 
  range: DataRange, 
  maxRows: number = 5
): { preview: string; insights: string } => {
  const subset = data.slice(range.start, range.end + 1);
  const previewRows = subset.slice(0, maxRows);
  
  const preview = previewRows.map((row, i) => 
    `Row ${range.start + i}: ${formatRowPreview(row)}`
  ).join('\n');

  const insights = [
    `• Showing ${previewRows.length} of ${subset.length} rows in range`,
    range.isFullDataset ? '• Viewing full dataset' : `• Subset: ${range.totalRows} rows (${((range.totalRows / data.length) * 100).toFixed(1)}% of total)`,
    range.isSingleRow ? '• Viewing single row' : `• Range span: ${range.totalRows} rows`,
  ].join('\n');

  return {
    preview,
    insights: subset.length > maxRows ? 
      `${insights}\n• ${subset.length - maxRows} more rows in range...` : 
      insights
  };
};

// Enhanced range parsing with natural language support
const parseIndexRange = (msg: string, maxRows: number): DataRange => {
  const patterns = [
    { regex: /(?:from|between)?\s*(?:row|index)?\s*(\d+)\s*(?:to|-|and)\s*(\d+)/, type: 'range' },
    { regex: /first\s+(\d+)\s*(?:rows?|entries|records)/i, type: 'first' },
    { regex: /last\s+(\d+)\s*(?:rows?|entries|records)/i, type: 'last' },
    { regex: /rows?\s*(\d+)\s*through\s*(\d+)/, type: 'range' },
    { regex: /row\s*(\d+)(?!\s*(?:to|through|-|and))/i, type: 'single' }
  ];

  let start = 0, end = maxRows - 1;

  for (const pattern of patterns) {
    const match = msg.match(pattern.regex);
    if (match) {
      switch (pattern.type) {
        case 'range':
          start = parseInt(match[1]);
          end = parseInt(match[2]);
          break;
        case 'first':
          end = Math.min(parseInt(match[1]) - 1, maxRows - 1);
          break;
        case 'last':
          start = Math.max(0, maxRows - parseInt(match[1]));
          break;
        case 'single':
          start = end = parseInt(match[1]);
          break;
      }
      break;
    }
  }

  // Validate and adjust range
  if (start >= maxRows || end >= maxRows) {
    return {
      start: 0,
      end: maxRows - 1,
      isValid: false,
      errorMessage: `Dataset has ${maxRows} rows. Please select a range between 0 and ${maxRows - 1}.`,
      totalRows: 0,
      isFullDataset: false,
      isSingleRow: false
    };
  }

  // Ensure start <= end and both are non-negative
  start = Math.max(0, Math.min(start, end));
  end = Math.max(start, Math.min(end, maxRows - 1));
  const totalRows = end - start + 1;

  return { 
    start, 
    end, 
    isValid: true,
    totalRows,
    isFullDataset: start === 0 && end === maxRows - 1,
    isSingleRow: start === end
  };
};

// Helper function to describe distribution changes
const getDistributionChangeDescription = (stats1: StatisticalResult, stats2: StatisticalResult): string => {
  const changes: string[] = [];

  // Analyze spread
  if (stats2.variance > stats1.variance * 1.5) {
    changes.push('more spread out');
  } else if (stats2.variance * 1.5 < stats1.variance) {
    changes.push('more concentrated');
  }

  // Analyze symmetry
  if (Math.abs(stats2.skewness) < Math.abs(stats1.skewness) * 0.7) {
    changes.push('more symmetric');
  } else if (Math.abs(stats2.skewness) > Math.abs(stats1.skewness) * 1.3) {
    changes.push(stats2.skewness > 0 ? 'more right-skewed' : 'more left-skewed');
  }

  // Analyze peaks
  if (stats2.kurtosis > stats1.kurtosis * 1.3) {
    changes.push('more peaked');
  } else if (stats2.kurtosis < stats1.kurtosis * 0.7) {
    changes.push('flatter');
  }

  return changes.length > 0 ? 
    `Distribution became ${changes.join(', ')}` : 
    'Distribution remained similar';
};

// Smart column matching
const findBestColumnMatch = (query: string, columns: string[]): { column: string; confidence: number } | null => {
  const normalizedQuery = query.toLowerCase();
  
  // Exact match
  const exactMatch = columns.find(col => col.toLowerCase() === normalizedQuery);
  if (exactMatch) return { column: exactMatch, confidence: 1 };

  // Partial match
  const partialMatches = columns
    .map(col => ({
      column: col,
      confidence: col.toLowerCase().includes(normalizedQuery) ? 0.8 :
                 normalizedQuery.includes(col.toLowerCase()) ? 0.6 : 0
    }))
    .filter(match => match.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  return partialMatches.length > 0 ? partialMatches[0] : null;
};

// Get subset statistics with smart memoization
const getSubsetStats = (data: Dataset['data'], column: string, range: DataRange): StatisticalResult | null => {
  const memoKey = `${column}-${range.start}-${range.end}`;
  const now = Date.now();
  
  // Check memoized result
  const memoized = memoizedResults.get(memoKey);
  if (memoized && now - memoized.timestamp < MEMO_EXPIRY) {
    return memoized.stats;
  }

  const subset = data.slice(range.start, range.end + 1);
  const stats = calculateStats(subset, column);
  
  // Only memoize if the range is significant
  if (stats && range.totalRows > 100) {
    memoizedResults.set(memoKey, {
      stats,
      timestamp: now,
      rangeKey: memoKey
    });

    // Clean up old memoized results
    for (const [key, value] of memoizedResults.entries()) {
      if (now - value.timestamp > MEMO_EXPIRY) {
        memoizedResults.delete(key);
      }
    }
  }

  return stats;
};

// Compare statistics between two ranges
const compareRanges = (
  data: Dataset['data'], 
  column: string, 
  range1: DataRange, 
  range2: DataRange
): ComparisonResult => {
  const stats1 = getSubsetStats(data, column, range1);
  const stats2 = getSubsetStats(data, column, range2);

  if (!stats1 || !stats2) {
    throw new Error('Could not calculate statistics for one or both ranges');
  }

  const difference = stats2.avg - stats1.avg;
  const percentageChange = ((stats2.avg - stats1.avg) / stats1.avg) * 100;

  // Add distribution comparison
  const distributionChange = {
    skewnessChange: stats2.skewness - stats1.skewness,
    kurtosisChange: stats2.kurtosis - stats1.kurtosis,
    varianceRatio: stats2.variance / stats1.variance,
    description: getDistributionChangeDescription(stats1, stats2)
  };

  return {
    range1,
    range2,
    stats1,
    stats2,
    difference,
    percentageChange,
    distributionChange
  };
};

// Function to format dataset context for AI analysis with range support
const formatDatasetContext = (dataset: Dataset, range?: DataRange) => {
  const data = range ? 
    dataset.data.slice(range.start, range.end + 1) : 
    dataset.data;
  
  const columnTypes = getColumnTypes(data);
  const stats = columnTypes.numeric.map(col => {
    const colStats = calculateStats(data, col);
    return colStats ? `${col}: avg=${colStats.avg.toFixed(2)}, range=${colStats.min}-${colStats.max}` : null;
  }).filter(Boolean);

  // Generate row preview and insights
  const { preview, insights } = generateRowPreview(data, range || { start: 0, end: data.length - 1, isValid: true, totalRows: data.length, isFullDataset: true, isSingleRow: false });

  return `Dataset: ${dataset.name}
${range ? `Analyzing rows ${range.start} to ${range.end} (${range.end - range.start + 1} rows)` : 
          `Full dataset: ${dataset.data.length} rows`}
Columns: ${dataset.columns.map(c => c.name).join(', ')}
Numeric columns: ${columnTypes.numeric.join(', ')}
Key statistics:
${stats.join('\n')}

Row Preview:
${preview}

Insights:
${insights}`;
};

// Data Quality Assessment Functions
const assessDataQuality = (dataset: Dataset): DataQualityAssessment => {
  const columnTypes = getColumnTypes(dataset.data);
  const outlierCounts: Record<string, number> = {};
  
  // Check completeness
  const totalFields = dataset.data.length * dataset.columns.length;
  const filledFields = dataset.data.reduce((acc, row) => {
    return acc + Object.values(row).filter(val => val !== null && val !== undefined && val !== '').length;
  }, 0);
  const completeness = (filledFields / totalFields) * 100;

  // Check consistency and find duplicates
  const duplicateRows = new Set();
  const rowSignatures = dataset.data.map(row => JSON.stringify(row));
  const duplicateCount = rowSignatures.filter((sig, index) => {
    if (rowSignatures.indexOf(sig) !== index) {
      duplicateRows.add(index);
      return true;
    }
    return false;
  }).length;

  // Calculate outliers for numeric columns
  columnTypes.numeric.forEach(col => {
    const stats = calculateStats(dataset.data, col);
    if (stats?.outliers) {
      outlierCounts[col] = stats.outliers.length;
    }
  });

  // Generate suggestions
  const suggestions = [];
  
  if (completeness < 95) {
    suggestions.push({
      type: 'completeness',
      severity: completeness < 80 ? 'high' : 'medium',
      description: `Dataset is ${completeness.toFixed(1)}% complete`,
      recommendation: 'Consider addressing missing values through imputation or removal'
    });
  }

  if (duplicateCount > 0) {
    suggestions.push({
      type: 'duplicates',
      severity: duplicateCount > dataset.data.length * 0.05 ? 'high' : 'medium',
      description: `Found ${duplicateCount} duplicate rows`,
      recommendation: 'Review and remove duplicate entries if they are not intentional'
    });
  }

  Object.entries(outlierCounts).forEach(([col, count]) => {
    if (count > 0) {
      suggestions.push({
        type: 'outliers',
        severity: count > dataset.data.length * 0.1 ? 'high' : 'medium',
        description: `Found ${count} outliers in column "${col}"`,
        recommendation: 'Investigate outliers and consider their impact on analysis'
      });
    }
  });

  // Estimate accuracy based on outliers and data type consistency
  const accuracy = 100 - (
    (Object.values(outlierCounts).reduce((a, b) => a + b, 0) / (dataset.data.length * columnTypes.numeric.length)) * 100
  );

  return {
    completeness,
    consistency: 100 - (duplicateCount / dataset.data.length) * 100,
    accuracy,
    duplicateCount,
    outlierCounts,
    suggestions
  };
};

// Visualization Recommendation Functions
const recommendVisualizations = (dataset: Dataset, selectedColumns: string[] = []): VisualizationRecommendation[] => {
  const columnTypes = getColumnTypes(dataset.data);
  const recommendations: VisualizationRecommendation[] = [];
  const cols = selectedColumns.length > 0 ? selectedColumns : dataset.columns.map(c => c.name);

  // Single column visualizations
  cols.forEach(col => {
    if (columnTypes.numeric.includes(col)) {
      // Numeric column recommendations
      recommendations.push({
        chartType: 'histogram',
        confidence: 0.9,
        reasoning: 'Best for showing distribution of numerical data',
        description: `Show the distribution of ${col} values`,
        suitable_columns: [col]
      });

      recommendations.push({
        chartType: 'boxplot',
        confidence: 0.85,
        reasoning: 'Good for showing data distribution and outliers',
        description: `Display ${col} distribution with quartiles and outliers`,
        suitable_columns: [col]
      });
    } else {
      // Categorical column recommendations
      recommendations.push({
        chartType: 'bar',
        confidence: 0.9,
        reasoning: 'Best for comparing categories',
        description: `Compare frequencies of different ${col} values`,
        suitable_columns: [col]
      });

      recommendations.push({
        chartType: 'pie',
        confidence: 0.7,
        reasoning: 'Suitable for showing proportions if categories are few',
        description: `Show proportion of each ${col} category`,
        suitable_columns: [col]
      });
    }
  });

  // Two-column visualizations
  if (cols.length >= 2) {
    const numericPairs = columnTypes.numeric.filter(col => cols.includes(col))
      .flatMap((col1, i, arr) => arr.slice(i + 1).map(col2 => [col1, col2]));

    numericPairs.forEach(([col1, col2]) => {
      recommendations.push({
        chartType: 'scatter',
        confidence: 0.95,
        reasoning: 'Best for showing relationship between two numeric variables',
        description: `Visualize correlation between ${col1} and ${col2}`,
        suitable_columns: [col1, col2]
      });
    });

    // Numeric vs Categorical
    columnTypes.numeric.filter(col => cols.includes(col)).forEach(numCol => {
      cols.filter(col => !columnTypes.numeric.includes(col)).forEach(catCol => {
        recommendations.push({
          chartType: 'grouped_bar',
          confidence: 0.85,
          reasoning: 'Good for comparing numeric values across categories',
          description: `Compare ${numCol} across different ${catCol} groups`,
          suitable_columns: [numCol, catCol]
        });
      });
    });
  }

  // Sort by confidence
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

// Enhanced AI analysis handler with advanced capabilities
const handleAIAnalysis = async (query: string, dataset: Dataset) => {
  // Parse any range in the query
  const range = parseIndexRange(query, dataset.data.length);
  const context = formatDatasetContext(dataset, range.isValid ? range : undefined);

  // Calculate advanced statistics and correlations
  const columnTypes = getColumnTypes(dataset.data);
  const advancedStats: Record<string, StatisticalResult> = columnTypes.numeric.reduce((acc, col) => {
    const stats = calculateAdvancedStats(dataset.data, col);
    if (stats) acc[col] = stats;
    return acc;
  }, {} as Record<string, StatisticalResult>);

  const correlationMatrix = calculateCorrelationMatrix(dataset);

  // Add insights about correlations
  const significantCorrelations = [];
  Object.keys(correlationMatrix).forEach(col1 => {
    Object.keys(correlationMatrix[col1]).forEach(col2 => {
      if (col1 !== col2) {
        const correlation = correlationMatrix[col1][col2];
        if (Math.abs(correlation) > 0.5) {
          significantCorrelations.push({
            columns: [col1, col2],
            correlation,
            strength: Math.abs(correlation) > 0.8 ? 'strong' : 'moderate'
          });
        }
      }
    });
  });

  // Build enhanced context including advanced stats and correlations
  const enhancedContext = `
${context}

Advanced Statistical Analysis:
${Object.entries(advancedStats).map(([col, stats]) => `
${col}:
• Mean: ${stats.avg.toFixed(2)} (${stats.confidenceInterval.level * 100}% CI: ${stats.confidenceInterval.lower.toFixed(2)} - ${stats.confidenceInterval.upper.toFixed(2)})
• Distribution: ${stats.normalityTest.isNormal ? 'Approximately normal' : 'Non-normal'} (Shapiro-Wilk: ${stats.normalityTest.statistic.toFixed(3)})
• Outliers: ${stats.outliers?.length || 0} detected`).join('\n')}

Significant Correlations:
${significantCorrelations.map(corr => 
  `• ${corr.columns[0]} and ${corr.columns[1]}: ${corr.correlation.toFixed(3)} (${corr.strength} ${corr.correlation > 0 ? 'positive' : 'negative'} correlation)`
).join('\n')}`;

  const prompt = `
Dataset Analysis Context:
${enhancedContext}

User Query: ${query}

Please provide a comprehensive analysis addressing the query. Include:
1. Direct answer to the query with statistical confidence
2. Related insights and patterns, particularly noting correlations
3. Statistical significance and confidence intervals where applicable
4. Distribution characteristics and normality assessment
5. Notable outliers, anomalies, or patterns
6. Data-driven recommendations based on the findings
7. Suggestions for further analysis if relevant

Analysis:`;

  const aiResponse = await callGroqAPI(prompt);
  return aiResponse || 'AI analysis unavailable. Falling back to basic analysis.';
};

// Enhanced reply function with better natural language processing
const getEnhancedReply = (msg: string, dataset: Dataset): string => {
  const columns = Object.keys(dataset.data[0] || {});
  const columnTypes = getColumnTypes(dataset.data);
  
  // Help command
  if (msg.includes('help') || msg.includes('hi') || msg.includes('hello')) {
    return `Here's what I can help you with:

📊 **Statistics and Analysis**:
• "average [column]", "min/max [column]", "stats for [column]"
• "correlations between [column1] and [column2]"
• "show distribution of [column]"
• "find outliers in [column]"

🔍 **Data Ranges and Filtering**:
• "rows 10 to 50", "first 100 rows", "last 20 entries"
• "compare first 100 vs last 100 for [column]"

📈 **Visualizations**:
• "recommend charts for [column]"
• "best visualization for [column1] and [column2]"
• "show distribution plot for [column]"

🎯 **Data Quality**:
• "check data quality"
• "find duplicates"
• "detect outliers"

🤖 **AI Analysis**: 
Start with "@ai" for advanced insights like:
• "@ai analyze trends"
• "@ai find correlations"
• "@ai explain patterns"

**Available columns**: ${columns.join(', ')}
**Numeric columns**: ${columnTypes.numeric.join(', ')}

Try: "average ${columnTypes.numeric[0] || 'price'}" or "@ai analyze trends in the data"`;
  }

  // Data quality request
  if (msg.includes('data quality') || msg.includes('quality check')) {
    const quality = assessDataQuality(dataset);
    return `Data Quality Assessment:

Overall Metrics:
• Completeness: ${quality.completeness.toFixed(1)}%
• Consistency: ${quality.consistency.toFixed(1)}%
• Accuracy: ${quality.accuracy.toFixed(1)}%

${quality.duplicateCount > 0 ? `• Found ${quality.duplicateCount} duplicate rows` : '• No duplicates found'}

Outliers detected:
${Object.entries(quality.outlierCounts)
  .map(([col, count]) => `• ${col}: ${count} outliers`)
  .join('\n')}

Recommendations:
${quality.suggestions.map(s => `• ${s.description} - ${s.recommendation}`).join('\n')}`;
  }

  // Visualization recommendations
  if (msg.includes('recommend chart') || msg.includes('visualization') || msg.includes('plot')) {
    const columnMatch = columns.find(col => msg.toLowerCase().includes(col.toLowerCase()));
    const recommendations = recommendVisualizations(dataset, columnMatch ? [columnMatch] : []);
    
    return `Visualization Recommendations:
${recommendations.slice(0, 5).map(r => 
  `• ${r.chartType.toUpperCase()}: ${r.description}
   Confidence: ${(r.confidence * 100).toFixed(0)}% - ${r.reasoning}`
).join('\n\n')}`;
  }

  // Correlations
  if (msg.includes('correlation')) {
    const matrix = calculateCorrelationMatrix(dataset);
    const significantCorrelations = [];
    
    Object.keys(matrix).forEach(col1 => {
      Object.keys(matrix[col1]).forEach(col2 => {
        if (col1 !== col2) {
          const correlation = matrix[col1][col2];
          if (Math.abs(correlation) > 0.5) {
            significantCorrelations.push({
              columns: [col1, col2],
              correlation,
              strength: Math.abs(correlation) > 0.8 ? 'strong' : 'moderate'
            });
          }
        }
      });
    });

    return `Correlation Analysis:
${significantCorrelations.map(corr => 
  `• ${corr.columns[0]} vs ${corr.columns[1]}: ${corr.correlation.toFixed(3)} 
   (${corr.strength} ${corr.correlation > 0 ? 'positive' : 'negative'} correlation)`
).join('\n\n')}

${significantCorrelations.length === 0 ? 
  'No significant correlations found between numeric columns.' : 
  `Found ${significantCorrelations.length} significant correlations.`}`;
  }

  // Parse range from query
  const range = parseIndexRange(msg, dataset.data.length);
  
  // Statistical queries with confidence intervals
  for (const column of columnTypes.numeric) {
    if (msg.toLowerCase().includes(column.toLowerCase())) {
      const advStats = calculateAdvancedStats(dataset.data, column, 0.95);
      
      if (advStats) {
        const rangeDesc = range.isValid && !range.isFullDataset ? 
          ` (rows ${range.start}-${range.end})` : '';
        
        if (msg.includes('average') || msg.includes('mean')) {
          return `The average ${column}${rangeDesc} is ${advStats.avg.toFixed(2)}
95% Confidence Interval: ${advStats.confidenceInterval.lower.toFixed(2)} - ${advStats.confidenceInterval.upper.toFixed(2)}
Distribution: ${advStats.normalityTest.isNormal ? 'Approximately normal' : 'Non-normal'} distribution`;
        }
        if (msg.includes('stats') || msg.includes('summary')) {
          return `Statistics for ${column}${rangeDesc}:
• Average: ${advStats.avg.toFixed(2)}
• 95% Confidence Interval: ${advStats.confidenceInterval.lower.toFixed(2)} - ${advStats.confidenceInterval.upper.toFixed(2)}
• Range: ${advStats.min} to ${advStats.max}
• Median: ${advStats.median.toFixed(2)}
• Standard Deviation: ${advStats.stdDev.toFixed(2)}
• Distribution: ${advStats.normalityTest.isNormal ? 'Approximately normal' : 'Non-normal'}
• Skewness: ${advStats.skewness.toFixed(3)}
• Outliers: ${advStats.outliers?.length || 0} detected

${advStats.normalityTest.isNormal ?
  'The data appears to follow a normal distribution, suggesting reliable statistical inference.' :
  'The data deviates from normality, consider non-parametric methods for analysis.'}`;
        }
      }
    }
  }

  // General dataset info
  if (msg.includes('dataset') || msg.includes('data') || msg.includes('info')) {
    const quality = assessDataQuality(dataset);
    const recommendations = recommendVisualizations(dataset);

    return `Dataset "${dataset.name}" Analysis:

Overview:
• ${dataset.data.length} rows
• ${columns.length} columns: ${columns.join(', ')}
• ${columnTypes.numeric.length} numeric columns
• ${columnTypes.text.length} text columns

Data Quality:
• Completeness: ${quality.completeness.toFixed(1)}%
• Consistency: ${quality.consistency.toFixed(1)}%
• Accuracy: ${quality.accuracy.toFixed(1)}%

Top Visualization Recommendations:
${recommendations.slice(0, 3).map(r => `• ${r.chartType}: ${r.description}`).join('\n')}

Try:
• "@ai analyze trends"
• "stats for [column name]"
• "correlations between columns"
• "recommend charts"`;
  }

  return `I understand you're asking about the dataset. Try:
• "help" for available commands
• "stats for [column name]" for detailed statistics
• "data quality" for quality assessment
• "recommend charts" for visualization suggestions
• "@ai [your question]" for AI-powered analysis
• Column names: ${columns.slice(0, 3).join(', ')}${columns.length > 3 ? '...' : ''}`;
};

// Component state and functions
export default function AIAnalysis() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/datasets');
          if (!response.ok) {
            const errorText = await response.text();
            toast.error(`Failed to fetch datasets: ${errorText}`);
            return;
          }
          const data = await response.json();
          setDatasets(data);
        } catch (err) {
          const error = err as Error;
          toast.error(`Error loading datasets: ${error.message}`);
        }
      }
    };
    fetchDatasets();
  }, [session?.user?.id]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleDatasetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = datasets.find(d => d._id === selectedId);
    if (selected) {
      setCurrentDataset(selected);
      setCurrentPage(0);

      // Calculate initial data quality assessment
      const quality = assessDataQuality(selected);
      const visualRecommendations = recommendVisualizations(selected);

      setMessages([{
        sender: 'bot',
        text: `Dataset "${selected.name}" selected! Here's a quick overview:

Data Quality Assessment:
• Completeness: ${quality.completeness.toFixed(1)}%
• Consistency: ${quality.consistency.toFixed(1)}%
• Accuracy: ${quality.accuracy.toFixed(1)}%
${quality.suggestions.map(s => `• ${s.description} - ${s.recommendation}`).join('\n')}

Top Visualization Recommendations:
${visualRecommendations.slice(0, 3).map(r => `• ${r.chartType}: ${r.description}`).join('\n')}

I can help you analyze this data. Try:
• "@ai analyze trends"
• "@ai find correlations"
• "@ai what insights can you share?"
• Or ask about specific columns and statistics!`
      }]);
      toast.success(`Selected: ${selected.name}`);
    } else {
      setCurrentDataset(null);
      setMessages([]);
      setCurrentPage(0);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentDataset) return;
    
    const userMsg = { sender: 'user' as const, text: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    
    let reply: string;
    if (input.startsWith('@ai ')) {
      // Enhanced AI analysis
      const aiPrompt = input.slice(4);
      reply = await handleAIAnalysis(aiPrompt, currentDataset);
    } else {
      reply = getEnhancedReply(input.toLowerCase(), currentDataset);
    }
    
    setMessages((prev) => [...prev, { 
      sender: 'bot', 
      text: reply,
      isAIEnhanced: input.startsWith('@ai ')
    }]);
    setIsTyping(false);
    setInput('');
  };

  const getPaginatedData = () => {
    if (!currentDataset) return [];
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return currentDataset.data.slice(startIndex, endIndex);
  };

  const totalPages = currentDataset ? Math.ceil(currentDataset.data.length / rowsPerPage) : 0;

  const handleNextPage = () => {
    if (currentPage + 1 < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">AI Dataset Chat</h1>

      {/* Add AI feature hint */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-700">
        💡 Pro tip: Start your message with @ai to get AI-powered advanced analysis
      </div>
      
      {/* Dataset Selection */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-200">
        <label htmlFor="dataset-select" className="block text-sm font-semibold text-gray-900 mb-2">
          Select Dataset
        </label>
        <select
          id="dataset-select"
          className="w-full border border-gray-300 p-3 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={currentDataset?._id || ''}
          onChange={handleDatasetChange}
        >
          <option value="">-- Choose your dataset --</option>
          {datasets.map((dataset) => (
            <option key={dataset._id} value={dataset._id}>
              {dataset.name} ({dataset._id.slice(0, 6)})
            </option>
          ))}
        </select>
      </div>

      {currentDataset && (
        <div className="space-y-6">
          {/* Chat Section - Large */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-gray-900 font-semibold text-xl mb-4">
              Chatting about: <span className="text-blue-700">{currentDataset.name}</span>
              <span className="text-sm text-gray-600 ml-2">
                ({currentDataset.data.length} rows, {Object.keys(currentDataset.data[0] || {}).length} columns)
              </span>
            </div>

            <div
              ref={chatRef}
              className="overflow-y-auto p-6 bg-gray-50 rounded-lg space-y-4 mb-6 border border-gray-200"
              style={{ height: '600px' }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] p-4 rounded-xl text-sm whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-blue-700 text-white self-end ml-auto'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  }`}
                >
                  {m.isAIEnhanced && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-blue-500">
                      <span className="bg-blue-100 px-2 py-1 rounded">AI Enhanced</span>
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div className="max-w-[85%] p-4 rounded-xl text-sm bg-white text-gray-900 border border-gray-200 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="Ask about the dataset... (try 'help' for suggestions)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !currentDataset}
                className="text-white px-8 py-3 rounded-lg hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                style={{ backgroundColor: '#1d4ed8' }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Dataset Preview Table */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div className="text-gray-900 font-semibold text-xl">
                Dataset Preview
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, currentDataset.data.length)} of {currentDataset.data.length} rows
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage + 1 >= totalPages}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(currentDataset.data[0] || {}).map((column) => (
                      <th
                        key={column}
                        className="px-6 py-4 text-left text-xs font-medium text-gray-900 uppercase tracking-wider border-b border-gray-200"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedData().map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {Object.keys(currentDataset.data[0] || {}).map((column) => (
                        <td
                          key={column}
                          className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                        >
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}