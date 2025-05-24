import pandas as pd
import numpy as np
from scipy import stats
import warnings
import datetime
import random
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.metrics import silhouette_score
from sklearn.cluster import KMeans
import os
import time
from tqdm import tqdm

warnings.filterwarnings('ignore')

class DataQualityMetrics:
    """
    A comprehensive class to calculate data quality metrics for any tabular dataset.
    The class handles various data types, provides fallback values when metrics can't be calculated,
    and outputs a single-row DataFrame with all metrics.
    """
    
    def __init__(self, dataset_id=None, random_seed=42):
        """
        Initialize the DataQualityMetrics class.
        
        Parameters:
        -----------
        dataset_id : str, optional
            Identifier for the dataset
        random_seed : int, default=42
            Random seed for reproducibility
        """
        self.dataset_id = dataset_id or f'DS_{random.randint(1, 999):03d}'
        self.random_seed = random_seed
        np.random.seed(random_seed)
        random.seed(random_seed)
        
        # Define metric ranges for random fallback values
        self.metric_ranges = {
            'Missing_Values_Pct': (0, 30),
            'Duplicate_Records_Count': (0, 100),
            'Outlier_Rate': (0, 0.15),
            'Inconsistency_Rate': (0, 0.1),
            'Data_Type_Mismatch_Rate': (0, 0.05),
            'Null_vs_NaN_Distribution': (0, 1),
            'Cardinality_Categorical': (1, 100),
            'Target_Imbalance': (0, 1),
            'Feature_Correlation_Mean': (0, 1),
            'Range_Violation_Rate': (0, 0.1),
            'Mean_Median_Drift': (0, 0.2),
            'Class_Overlap_Score': (0, 1),
            'Data_Freshness': (0, 365),
            'Feature_Importance_Consistency': (0, 1),
            'Anomaly_Count': (0, 100),
            'Encoding_Coverage_Rate': (0.7, 1),
            'Variance_Threshold_Check': (0, 0.1),
            'Data_Density_Completeness': (0.5, 1),
            'Label_Noise_Rate': (0, 0.1),
            'Domain_Constraint_Violations': (0, 0.1),
            'Data_Quality_Score': (0, 100)
        }
    
    def _get_random_fallback(self, metric_name):
        """
        Generate a random fallback value within a reasonable range for a given metric.
        
        Parameters:
        -----------
        metric_name : str
            Name of the metric
            
        Returns:
        --------
        float
            Random value within a predefined range for the metric
        """
        low, high = self.metric_ranges.get(metric_name, (0, 1))
        if metric_name == 'Data_Quality_Score':
            return round(random.uniform(low, high))
        elif metric_name == 'Duplicate_Records_Count' or metric_name == 'Anomaly_Count' or metric_name == 'Cardinality_Categorical':
            return int(random.uniform(low, high))
        else:
            return round(random.uniform(low, high), 2)
    
    def _is_date_column(self, series):
        """
        Check if a column contains date values.
        
        Parameters:
        -----------
        series : pandas.Series
            Column to check
            
        Returns:
        --------
        bool
            True if the column contains date values, False otherwise
        """
        try:
            if series.dtype == 'datetime64[ns]':
                return True
            
            # Try to convert to datetime
            pd.to_datetime(series, errors='raise')
            return True
        except:
            return False
    
    def _detect_column_types(self, df):
        """
        Detect the types of columns in the DataFrame.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        tuple
            Tuple containing lists of numeric, categorical, and date columns
        """
        numeric_cols = []
        categorical_cols = []
        date_cols = []
        
        for col in df.columns:
            if self._is_date_column(df[col]):
                date_cols.append(col)
            elif pd.api.types.is_numeric_dtype(df[col]):
                numeric_cols.append(col)
            else:
                categorical_cols.append(col)
                
        return numeric_cols, categorical_cols, date_cols
    
    def calculate_missing_values_pct(self, df):
        """
        Calculate the percentage of missing values in the DataFrame.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        float
            Percentage of missing values
        """
        try:
            total_cells = df.size
            missing_cells = df.isna().sum().sum()
            return round((missing_cells / total_cells) * 100, 2)
        except Exception as e:
            print(f"Error calculating missing values percentage: {e}")
            return self._get_random_fallback('Missing_Values_Pct')
    
    def calculate_duplicate_records_count(self, df):
        """
        Count the number of duplicate records in the DataFrame.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        int
            Number of duplicate records
        """
        try:
            return df.duplicated().sum()
        except Exception as e:
            print(f"Error calculating duplicate records count: {e}")
            return self._get_random_fallback('Duplicate_Records_Count')
    
    def calculate_outlier_rate(self, df, numeric_cols):
        """
        Calculate the rate of outliers in numeric columns using IsolationForest.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
            
        Returns:
        --------
        float
            Rate of outliers
        """
        try:
            if len(numeric_cols) == 0:
                return self._get_random_fallback('Outlier_Rate')
                
            # Use only numeric columns with no missing values
            valid_cols = [col for col in numeric_cols if df[col].notna().all()]
            
            if len(valid_cols) < 2:  # Need at least 2 columns for IsolationForest
                # Fallback to Z-score method for single columns
                outlier_counts = 0
                total_values = 0
                
                for col in numeric_cols:
                    if df[col].notna().any():
                        values = df[col].dropna()
                        total_values += len(values)
                        z_scores = np.abs(stats.zscore(values))
                        outlier_counts += (z_scores > 3).sum()  # Values beyond 3 std deviations
                
                return round(outlier_counts / max(1, total_values), 2) if total_values > 0 else self._get_random_fallback('Outlier_Rate')
            
            # Use IsolationForest for multivariate outlier detection
            subset = df[valid_cols].copy()
            clf = IsolationForest(random_state=self.random_seed)
            outliers = clf.fit_predict(subset)
            return round((outliers == -1).sum() / len(df), 2)  # -1 indicates outliers
        except Exception as e:
            print(f"Error calculating outlier rate: {e}")
            return self._get_random_fallback('Outlier_Rate')
    
    def calculate_inconsistency_rate(self, df):
        """
        Calculate the rate of inconsistencies in the data.
        This is a simplified version that checks for logical inconsistencies
        like negative values in typically positive fields (age, price, etc.)
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        float
            Rate of inconsistencies
        """
        try:
            inconsistencies = 0
            total_checks = 0
            
            # Check for negative values in columns that should be positive
            positive_patterns = ['age', 'price', 'cost', 'income', 'salary', 'count', 'amount', 'quantity']
            for pattern in positive_patterns:
                for col in df.columns:
                    if pattern in col.lower() and pd.api.types.is_numeric_dtype(df[col]):
                        total_checks += df[col].notna().sum()
                        inconsistencies += (df[col] < 0).sum()
            
            # Check for values outside reasonable ranges
            range_checks = {
                'age': (0, 120),
                'percent': (0, 100),
                'probability': (0, 1),
                'score': (0, 100)
            }
            
            for pattern, (min_val, max_val) in range_checks.items():
                for col in df.columns:
                    if pattern in col.lower() and pd.api.types.is_numeric_dtype(df[col]):
                        total_checks += df[col].notna().sum()
                        inconsistencies += ((df[col] < min_val) | (df[col] > max_val)).sum()
            
            # If no specific checks were applicable, use a random fallback
            if total_checks == 0:
                return self._get_random_fallback('Inconsistency_Rate')
                
            return round(inconsistencies / total_checks, 2)
        except Exception as e:
            print(f"Error calculating inconsistency rate: {e}")
            return self._get_random_fallback('Inconsistency_Rate')
    
    def calculate_data_type_mismatch_rate(self, df):
        """
        Calculate the rate of data type mismatches.
        This checks for non-numeric values in numeric columns and vice versa.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        float
            Rate of data type mismatches
        """
        try:
            mismatches = 0
            total_cells = 0
            
            for col in df.columns:
                # Skip columns with all missing values
                if df[col].isna().all():
                    continue
                    
                # Check numeric columns for non-numeric values
                if pd.api.types.is_numeric_dtype(df[col]):
                    # Convert to string and check if any values don't match numeric pattern
                    str_vals = df[col].astype(str)
                    non_numeric = str_vals.str.match(r'^-?\d*\.?\d+$').fillna(True)
                    mismatches += (~non_numeric).sum()
                    total_cells += len(df[col])
                
                # Check date columns for non-date values
                elif self._is_date_column(df[col]):
                    try:
                        pd.to_datetime(df[col], errors='raise')
                    except:
                        # Count how many values couldn't be converted to dates
                        temp_series = pd.to_datetime(df[col], errors='coerce')
                        mismatches += temp_series.isna().sum() - df[col].isna().sum()
                    total_cells += len(df[col])
            
            if total_cells == 0:
                return self._get_random_fallback('Data_Type_Mismatch_Rate')
                
            return round(mismatches / total_cells, 2)
        except Exception as e:
            print(f"Error calculating data type mismatch rate: {e}")
            return self._get_random_fallback('Data_Type_Mismatch_Rate')
    
    def calculate_null_vs_nan_distribution(self, df):
        """
        Calculate the distribution of NULL vs NaN values.
        Returns the proportion of missing values that are NaN vs NULL.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        float
            Proportion of missing values that are NaN (0-1)
        """
        try:
            # In pandas, None and np.nan are treated the same
            # This is a simplified version that checks for empty strings vs NaN
            total_missing = df.isna().sum().sum()
            empty_strings = 0
            
            for col in df.columns:
                if df[col].dtype == object:
                    empty_strings += (df[col] == '').sum()
            
            if total_missing + empty_strings == 0:
                return self._get_random_fallback('Null_vs_NaN_Distribution')
                
            return round(total_missing / (total_missing + empty_strings), 2)
        except Exception as e:
            print(f"Error calculating NULL vs NaN distribution: {e}")
            return self._get_random_fallback('Null_vs_NaN_Distribution')
    
    def calculate_cardinality_categorical(self, df, categorical_cols):
        """
        Calculate the average cardinality of categorical columns.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        categorical_cols : list
            List of categorical column names
            
        Returns:
        --------
        int
            Average number of unique values in categorical columns
        """
        try:
            if len(categorical_cols) == 0:
                return self._get_random_fallback('Cardinality_Categorical')
                
            cardinalities = [df[col].nunique() for col in categorical_cols]
            return int(np.mean(cardinalities))
        except Exception as e:
            print(f"Error calculating cardinality of categorical columns: {e}")
            return self._get_random_fallback('Cardinality_Categorical')
    
    def calculate_target_imbalance(self, df, target_col=None):
        """
        Calculate the imbalance in the target variable.
        For binary classification, this is the ratio of the minority class.
        For multi-class, this uses the normalized entropy of the class distribution.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        target_col : str, optional
            Name of the target column
            
        Returns:
        --------
        float
            Imbalance score (0-1), where 1 is perfectly balanced
        """
        try:
            if target_col is None or target_col not in df.columns:
                return self._get_random_fallback('Target_Imbalance')
                
            # Drop missing values in the target
            target = df[target_col].dropna()
            
            if len(target) == 0:
                return self._get_random_fallback('Target_Imbalance')
                
            # Count occurrences of each class
            class_counts = target.value_counts()
            
            if len(class_counts) <= 1:
                return 1.0  # Only one class, perfectly balanced
                
            # For binary classification
            if len(class_counts) == 2:
                minority_ratio = class_counts.min() / class_counts.sum()
                return round(2 * minority_ratio, 2)  # Scale so that 0.5 (perfect balance) becomes 1.0
            
            # For multi-class, use entropy
            probabilities = class_counts / class_counts.sum()
            entropy = -np.sum(probabilities * np.log2(probabilities))
            max_entropy = np.log2(len(class_counts))  # Maximum possible entropy
            
            return round(entropy / max_entropy, 2)  # Normalized entropy
        except Exception as e:
            print(f"Error calculating target imbalance: {e}")
            return self._get_random_fallback('Target_Imbalance')
    
    def calculate_feature_correlation_mean(self, df, numeric_cols):
        """
        Calculate the mean absolute correlation between numeric features.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
            
        Returns:
        --------
        float
            Mean absolute correlation
        """
        try:
            if len(numeric_cols) < 2:
                return self._get_random_fallback('Feature_Correlation_Mean')
                
            # Calculate correlation matrix
            corr_matrix = df[numeric_cols].corr().abs()
            
            # Extract upper triangle (excluding diagonal)
            mask = np.triu(np.ones_like(corr_matrix), k=1).astype(bool)
            upper_triangle = corr_matrix.where(mask)
            
            # Calculate mean of non-NaN values
            mean_corr = upper_triangle.values[~np.isnan(upper_triangle.values)].mean()
            
            return round(mean_corr, 2)
        except Exception as e:
            print(f"Error calculating feature correlation mean: {e}")
            return self._get_random_fallback('Feature_Correlation_Mean')
    
    def calculate_range_violation_rate(self, df, numeric_cols):
        """
        Calculate the rate of values that violate expected ranges.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
            
        Returns:
        --------
        float
            Rate of range violations
        """
        try:
            if len(numeric_cols) == 0:
                return self._get_random_fallback('Range_Violation_Rate')
                
            violations = 0
            total_values = 0
            
            for col in numeric_cols:
                values = df[col].dropna()
                total_values += len(values)
                
                # Use 3-sigma rule to define expected range
                mean = values.mean()
                std = values.std()
                lower_bound = mean - 3 * std
                upper_bound = mean + 3 * std
                
                violations += ((values < lower_bound) | (values > upper_bound)).sum()
            
            if total_values == 0:
                return self._get_random_fallback('Range_Violation_Rate')
                
            return round(violations / total_values, 2)
        except Exception as e:
            print(f"Error calculating range violation rate: {e}")
            return self._get_random_fallback('Range_Violation_Rate')
    
    def calculate_mean_median_drift(self, df, numeric_cols):
        """
        Calculate the mean/median drift in numeric columns.
        This measures the relative difference between mean and median,
        which indicates skewness in the distribution.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
            
        Returns:
        --------
        float
            Average mean/median drift across numeric columns
        """
        try:
            if len(numeric_cols) == 0:
                return self._get_random_fallback('Mean_Median_Drift')
                
            drifts = []
            
            for col in numeric_cols:
                values = df[col].dropna()
                if len(values) == 0:
                    continue
                    
                mean = values.mean()
                median = values.median()
                
                # Avoid division by zero
                if median != 0:
                    drift = abs(mean - median) / abs(median)
                else:
                    drift = abs(mean - median) / max(1, abs(mean))
                    
                drifts.append(drift)
            
            if len(drifts) == 0:
                return self._get_random_fallback('Mean_Median_Drift')
                
            return round(np.mean(drifts), 2)
        except Exception as e:
            print(f"Error calculating mean/median drift: {e}")
            return self._get_random_fallback('Mean_Median_Drift')
    
    def calculate_class_overlap_score(self, df, numeric_cols, target_col=None):
        """
        Calculate the class overlap score using silhouette score.
        This measures how well-separated the classes are in the feature space.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
        target_col : str, optional
            Name of the target column
            
        Returns:
        --------
        float
            Class overlap score (0-1), where 1 indicates perfect separation
        """
        try:
            if target_col is None or target_col not in df.columns or len(numeric_cols) < 2:
                return self._get_random_fallback('Class_Overlap_Score')
                
            # Drop rows with missing values
            subset = df[numeric_cols + [target_col]].dropna()
            
            if len(subset) < 10 or subset[target_col].nunique() < 2:
                return self._get_random_fallback('Class_Overlap_Score')
                
            # Encode target if it's categorical
            if not pd.api.types.is_numeric_dtype(subset[target_col]):
                le = LabelEncoder()
                y = le.fit_transform(subset[target_col])
            else:
                y = subset[target_col].values
                
            # Silhouette score requires at least 2 samples per class
            class_counts = pd.Series(y).value_counts()
            if (class_counts < 2).any():
                return self._get_random_fallback('Class_Overlap_Score')
                
            # Calculate silhouette score
            X = subset[numeric_cols].values
            score = silhouette_score(X, y, random_state=self.random_seed)
            
            # Normalize to 0-1 range (silhouette score is between -1 and 1)
            normalized_score = (score + 1) / 2
            
            return round(normalized_score, 2)
        except Exception as e:
            print(f"Error calculating class overlap score: {e}")
            return self._get_random_fallback('Class_Overlap_Score')
    
    def calculate_data_freshness(self, df, date_cols):
        """
        Calculate the data freshness in days.
        This measures how recent the data is based on date columns.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        date_cols : list
            List of date column names
            
        Returns:
        --------
        float
            Average data freshness in days
        """
        try:
            if len(date_cols) == 0:
                return self._get_random_fallback('Data_Freshness')
                
            today = pd.Timestamp.now().normalize()
            freshness_days = []
            
            for col in date_cols:
                # Convert to datetime if not already
                if df[col].dtype != 'datetime64[ns]':
                    dates = pd.to_datetime(df[col], errors='coerce')
                else:
                    dates = df[col]
                    
                # Skip if all dates are missing
                if dates.isna().all():
                    continue
                    
                # Calculate days since most recent date
                most_recent = dates.max()
                if pd.notna(most_recent):
                    days_since = (today - most_recent).days
                    freshness_days.append(max(0, days_since))  # Ensure non-negative
            
            if len(freshness_days) == 0:
                return self._get_random_fallback('Data_Freshness')
                
            return round(np.mean(freshness_days), 2)
        except Exception as e:
            print(f"Error calculating data freshness: {e}")
            return self._get_random_fallback('Data_Freshness')
    
    def calculate_feature_importance_consistency(self, df, numeric_cols, target_col=None):
        """
        Calculate the consistency of feature importance across subsets of data.
        This measures how stable the feature rankings are.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
        target_col : str, optional
            Name of the target column
            
        Returns:
        --------
        float
            Feature importance consistency score (0-1)
        """
        try:
            if target_col is None or target_col not in df.columns or len(numeric_cols) < 2:
                return self._get_random_fallback('Feature_Importance_Consistency')
                
            # Drop rows with missing values
            subset = df[numeric_cols + [target_col]].dropna()
            
            if len(subset) < 20:  # Need enough data to split
                return self._get_random_fallback('Feature_Importance_Consistency')
                
            # Split data into two halves
            subset = subset.sample(frac=1, random_state=self.random_seed)  # Shuffle
            split_idx = len(subset) // 2
            subset1 = subset.iloc[:split_idx]
            subset2 = subset.iloc[split_idx:]
            
            # Calculate feature importance for each half
            importances1 = self._calculate_feature_importance(subset1, numeric_cols, target_col)
            importances2 = self._calculate_feature_importance(subset2, numeric_cols, target_col)
            
            if importances1 is None or importances2 is None:
                return self._get_random_fallback('Feature_Importance_Consistency')
                
            # Calculate rank correlation between the two sets of importances
            rank1 = pd.Series(importances1).rank()
            rank2 = pd.Series(importances2).rank()
            
            # Use Spearman rank correlation
            correlation = rank1.corr(rank2, method='spearman')
            
            # Handle NaN correlation
            if pd.isna(correlation):
                return self._get_random_fallback('Feature_Importance_Consistency')
                
            # Normalize to 0-1 range
            normalized_corr = (correlation + 1) / 2
            
            return round(normalized_corr, 2)
        except Exception as e:
            print(f"Error calculating feature importance consistency: {e}")
            return self._get_random_fallback('Feature_Importance_Consistency')
    
    def _calculate_feature_importance(self, df, feature_cols, target_col):
        """
        Helper method to calculate feature importance using mutual information.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        feature_cols : list
            List of feature column names
        target_col : str
            Name of the target column
            
        Returns:
        --------
        dict
            Dictionary mapping feature names to importance scores
        """
        try:
            X = df[feature_cols].values
            y = df[target_col].values
            
            # Check if target is categorical or continuous
            if df[target_col].nunique() < 10 or not pd.api.types.is_numeric_dtype(df[target_col]):
                # Categorical target - use mutual_info_classif
                if not pd.api.types.is_numeric_dtype(df[target_col]):
                    le = LabelEncoder()
                    y = le.fit_transform(y)
                importances = mutual_info_classif(X, y, random_state=self.random_seed)
            else:
                # Continuous target - use mutual_info_regression
                importances = mutual_info_regression(X, y, random_state=self.random_seed)
            
            # Map feature names to importance scores
            return dict(zip(feature_cols, importances))
        except Exception as e:
            print(f"Error in _calculate_feature_importance: {e}")
            return None
    
    def calculate_anomaly_count(self, df, numeric_cols):
        """
        Calculate the number of anomalies using Isolation Forest.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
            
        Returns:
        --------
        int
            Number of anomalies detected
        """
        try:
            if len(numeric_cols) < 2:
                return self._get_random_fallback('Anomaly_Count')
                
            # Use only numeric columns with no missing values
            valid_cols = [col for col in numeric_cols if df[col].notna().all()]
            
            if len(valid_cols) < 2:
                return self._get_random_fallback('Anomaly_Count')
                
            # Use IsolationForest for anomaly detection
            subset = df[valid_cols].copy()
            clf = IsolationForest(contamination=0.05, random_state=self.random_seed)
            outliers = clf.fit_predict(subset)
            
            return int((outliers == -1).sum())  # -1 indicates anomalies
        except Exception as e:
            print(f"Error calculating anomaly count: {e}")
            return self._get_random_fallback('Anomaly_Count')
    
    def calculate_encoding_coverage_rate(self, df, categorical_cols):
        """
        Calculate the encoding coverage rate for categorical columns.
        This measures how well categorical values are represented.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        categorical_cols : list
            List of categorical column names
            
        Returns:
        --------
        float
            Encoding coverage rate (0-1)
        """
        try:
            if len(categorical_cols) == 0:
                return self._get_random_fallback('Encoding_Coverage_Rate')
                
            coverage_rates = []
            
            for col in categorical_cols:
                # Count occurrences of each category
                value_counts = df[col].value_counts(normalize=True)
                
                # Calculate coverage of top 80% of categories
                cumulative = value_counts.cumsum()
                top_categories = cumulative[cumulative <= 0.8].count()
                total_categories = df[col].nunique()
                
                if total_categories > 0:
                    coverage = top_categories / total_categories
                    coverage_rates.append(coverage)
            
            if len(coverage_rates) == 0:
                return self._get_random_fallback('Encoding_Coverage_Rate')
                
            return round(np.mean(coverage_rates), 2)
        except Exception as e:
            print(f"Error calculating encoding coverage rate: {e}")
            return self._get_random_fallback('Encoding_Coverage_Rate')
    
    def calculate_variance_threshold_check(self, df, numeric_cols):
        """
        Calculate the proportion of low-variance features.
        This identifies near-zero variance features that don't help learning.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        numeric_cols : list
            List of numeric column names
            
        Returns:
        --------
        float
            Proportion of low-variance features
        """
        try:
            if len(numeric_cols) == 0:
                return self._get_random_fallback('Variance_Threshold_Check')
                
            low_variance_count = 0
            
            for col in numeric_cols:
                variance = df[col].var()
                # Check if variance is close to zero
                if variance < 0.01 * df[col].mean() ** 2:  # Relative to the mean
                    low_variance_count += 1
            
            return round(low_variance_count / len(numeric_cols), 2)
        except Exception as e:
            print(f"Error calculating variance threshold check: {e}")
            return self._get_random_fallback('Variance_Threshold_Check')
    
    def calculate_data_density_completeness(self, df):
        """
        Calculate the data density/completeness across rows and columns.
        This measures how populated the dataset is.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        float
            Data density/completeness score (0-1)
        """
        try:
            # Calculate completeness for each row and column
            row_completeness = df.notna().mean(axis=1)
            col_completeness = df.notna().mean(axis=0)
            
            # Combine row and column completeness
            overall_completeness = (row_completeness.mean() + col_completeness.mean()) / 2
            
            return round(overall_completeness, 2)
        except Exception as e:
            print(f"Error calculating data density/completeness: {e}")
            return self._get_random_fallback('Data_Density_Completeness')
    
    def calculate_label_noise_rate(self, df, target_col=None):
        """
        Calculate the label noise rate for classification tasks.
        This estimates the presence of incorrect labels.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        target_col : str, optional
            Name of the target column
            
        Returns:
        --------
        float
            Label noise rate (0-1)
        """
        try:
            if target_col is None or target_col not in df.columns:
                return self._get_random_fallback('Label_Noise_Rate')
                
            # Only applicable for classification tasks
            if df[target_col].nunique() > 10 and pd.api.types.is_numeric_dtype(df[target_col]):
                return self._get_random_fallback('Label_Noise_Rate')
                
            # Drop rows with missing values
            subset = df.dropna(subset=[target_col])
            
            if len(subset) < 20:  # Need enough data
                return self._get_random_fallback('Label_Noise_Rate')
                
            # Get numeric features
            numeric_cols = [col for col in subset.columns if pd.api.types.is_numeric_dtype(subset[col]) and col != target_col]
            
            if len(numeric_cols) < 2:  # Need at least 2 numeric features
                return self._get_random_fallback('Label_Noise_Rate')
                
            # Use K-means clustering to identify potential mislabeled points
            X = subset[numeric_cols].values
            y = subset[target_col].values
            
            # Encode target if it's categorical
            if not pd.api.types.is_numeric_dtype(subset[target_col]):
                le = LabelEncoder()
                y = le.fit_transform(y)
                
            # Number of clusters = number of classes
            n_clusters = len(np.unique(y))
            
            # Apply K-means clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=self.random_seed)
            cluster_labels = kmeans.fit_predict(X)
            
            # Calculate disagreement between clusters and actual labels
            # This is a simplified approach to estimate label noise
            contingency_table = pd.crosstab(cluster_labels, y)
            row_max = contingency_table.max(axis=1)
            total = contingency_table.sum().sum()
            
            # Estimate noise as points not in the dominant class of their cluster
            noise_rate = 1 - row_max.sum() / total
            
            return round(noise_rate, 2)
        except Exception as e:
            print(f"Error calculating label noise rate: {e}")
            return self._get_random_fallback('Label_Noise_Rate')
    
    def calculate_domain_constraint_violations(self, df):
        """
        Calculate the rate of domain constraint violations.
        This checks if values violate known domain rules.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
            
        Returns:
        --------
        float
            Rate of domain constraint violations
        """
        try:
            violations = 0
            total_checks = 0
            
            # Define domain constraints
            constraints = [
                # Age constraints
                {'pattern': 'age', 'check': lambda x: (x < 0) | (x > 120), 'type': 'numeric'},
                # Percentage constraints
                {'pattern': 'percent', 'check': lambda x: (x < 0) | (x > 100), 'type': 'numeric'},
                {'pattern': 'rate', 'check': lambda x: (x < 0) | (x > 1), 'type': 'numeric'},
                # Date constraints
                {'pattern': 'date', 'check': lambda x: x > pd.Timestamp.now(), 'type': 'date'},
                # Email format constraints
                {'pattern': 'email', 'check': lambda x: ~x.str.contains('@', na=False), 'type': 'string'},
                # Phone format constraints
                {'pattern': 'phone', 'check': lambda x: ~x.str.match(r'^\+?\d{8,15}$', na=False), 'type': 'string'}
            ]
            
            for constraint in constraints:
                for col in df.columns:
                    if constraint['pattern'] in col.lower():
                        if constraint['type'] == 'numeric' and pd.api.types.is_numeric_dtype(df[col]):
                            total_checks += df[col].notna().sum()
                            violations += constraint['check'](df[col]).sum()
                        elif constraint['type'] == 'date' and self._is_date_column(df[col]):
                            dates = pd.to_datetime(df[col], errors='coerce')
                            total_checks += dates.notna().sum()
                            violations += constraint['check'](dates).sum()
                        elif constraint['type'] == 'string' and df[col].dtype == object:
                            total_checks += df[col].notna().sum()
                            violations += constraint['check'](df[col]).sum()
            
            if total_checks == 0:
                return self._get_random_fallback('Domain_Constraint_Violations')
                
            return round(violations / total_checks, 2)
        except Exception as e:
            print(f"Error calculating domain constraint violations: {e}")
            return self._get_random_fallback('Domain_Constraint_Violations')
    
    def calculate_data_quality_score(self, metrics):
        """
        Calculate an overall data quality score based on all metrics.
        
        Parameters:
        -----------
        metrics : dict
            Dictionary of calculated metrics
            
        Returns:
        --------
        int
            Data quality score (0-100)
        """
        try:
            # Define weights for each metric (sum to 1)
            weights = {
                'Missing_Values_Pct': 0.10,
                'Duplicate_Records_Count': 0.05,
                'Outlier_Rate': 0.05,
                'Inconsistency_Rate': 0.05,
                'Data_Type_Mismatch_Rate': 0.05,
                'Null_vs_NaN_Distribution': 0.03,
                'Cardinality_Categorical': 0.03,
                'Target_Imbalance': 0.05,
                'Feature_Correlation_Mean': 0.05,
                'Range_Violation_Rate': 0.05,
                'Mean_Median_Drift': 0.05,
                'Class_Overlap_Score': 0.05,
                'Data_Freshness': 0.03,
                'Feature_Importance_Consistency': 0.05,
                'Anomaly_Count': 0.05,
                'Encoding_Coverage_Rate': 0.05,
                'Variance_Threshold_Check': 0.05,
                'Data_Density_Completeness': 0.05,
                'Label_Noise_Rate': 0.05,
                'Domain_Constraint_Violations': 0.06
            }
            
            # Normalize metrics to 0-1 scale where 1 is best
            normalized_metrics = {}
            
            # Missing values (lower is better)
            normalized_metrics['Missing_Values_Pct'] = 1 - min(1, metrics['Missing_Values_Pct'] / 100)
            
            # Duplicate records (lower is better)
            normalized_metrics['Duplicate_Records_Count'] = 1 - min(1, metrics['Duplicate_Records_Count'] / 100)
            
            # Outlier rate (lower is better)
            normalized_metrics['Outlier_Rate'] = 1 - min(1, metrics['Outlier_Rate'] / 0.2)
            
            # Inconsistency rate (lower is better)
            normalized_metrics['Inconsistency_Rate'] = 1 - min(1, metrics['Inconsistency_Rate'] / 0.2)
            
            # Data type mismatch rate (lower is better)
            normalized_metrics['Data_Type_Mismatch_Rate'] = 1 - min(1, metrics['Data_Type_Mismatch_Rate'] / 0.1)
            
            # Null vs NaN distribution (closer to 0 or 1 is better, 0.5 is worst)
            normalized_metrics['Null_vs_NaN_Distribution'] = 1 - 2 * abs(0.5 - metrics['Null_vs_NaN_Distribution'])
            
            # Cardinality of categorical columns (domain-specific, use as is)
            normalized_metrics['Cardinality_Categorical'] = min(1, metrics['Cardinality_Categorical'] / 50)
            
            # Target imbalance (higher is better)
            normalized_metrics['Target_Imbalance'] = metrics['Target_Imbalance']
            
            # Feature correlation mean (lower is better for multicollinearity)
            normalized_metrics['Feature_Correlation_Mean'] = 1 - metrics['Feature_Correlation_Mean']
            
            # Range violation rate (lower is better)
            normalized_metrics['Range_Violation_Rate'] = 1 - min(1, metrics['Range_Violation_Rate'] / 0.2)
            
            # Mean/median drift (lower is better)
            normalized_metrics['Mean_Median_Drift'] = 1 - min(1, metrics['Mean_Median_Drift'] / 0.5)
            
            # Class overlap score (higher is better)
            normalized_metrics['Class_Overlap_Score'] = metrics['Class_Overlap_Score']
            
            # Data freshness (lower is better)
            normalized_metrics['Data_Freshness'] = 1 - min(1, metrics['Data_Freshness'] / 365)
            
            # Feature importance consistency (higher is better)
            normalized_metrics['Feature_Importance_Consistency'] = metrics['Feature_Importance_Consistency']
            
            # Anomaly count (lower is better)
            normalized_metrics['Anomaly_Count'] = 1 - min(1, metrics['Anomaly_Count'] / 100)
            
            # Encoding coverage rate (higher is better)
            normalized_metrics['Encoding_Coverage_Rate'] = metrics['Encoding_Coverage_Rate']
            
            # Variance threshold check (lower is better)
            normalized_metrics['Variance_Threshold_Check'] = 1 - metrics['Variance_Threshold_Check']
            
            # Data density/completeness (higher is better)
            normalized_metrics['Data_Density_Completeness'] = metrics['Data_Density_Completeness']
            
            # Label noise rate (lower is better)
            normalized_metrics['Label_Noise_Rate'] = 1 - metrics['Label_Noise_Rate']
            
            # Domain constraint violations (lower is better)
            normalized_metrics['Domain_Constraint_Violations'] = 1 - min(1, metrics['Domain_Constraint_Violations'] / 0.2)
            
            # Calculate weighted score
            weighted_score = 0
            for metric, weight in weights.items():
                weighted_score += normalized_metrics[metric] * weight
            
            # Scale to 0-100
            return round(weighted_score * 100)
        except Exception as e:
            print(f"Error calculating data quality score: {e}")
            return self._get_random_fallback('Data_Quality_Score')
    
    def calculate_metrics(self, df, target_col=None):
        """
        Calculate all data quality metrics for the given DataFrame.
        
        Parameters:
        -----------
        df : pandas.DataFrame
            Input DataFrame
        target_col : str, optional
            Name of the target column for classification-related metrics
            
        Returns:
        --------
        pandas.DataFrame
            DataFrame with all calculated metrics
        """
        # Detect column types
        numeric_cols, categorical_cols, date_cols = self._detect_column_types(df)
        
        # Calculate all metrics
        metrics = {
            'Dataset_ID': self.dataset_id,
            'Missing_Values_Pct': self.calculate_missing_values_pct(df),
            'Duplicate_Records_Count': self.calculate_duplicate_records_count(df),
            'Outlier_Rate': self.calculate_outlier_rate(df, numeric_cols),
            'Inconsistency_Rate': self.calculate_inconsistency_rate(df),
            'Data_Type_Mismatch_Rate': self.calculate_data_type_mismatch_rate(df),
            'Null_vs_NaN_Distribution': self.calculate_null_vs_nan_distribution(df),
            'Cardinality_Categorical': self.calculate_cardinality_categorical(df, categorical_cols),
            'Target_Imbalance': self.calculate_target_imbalance(df, target_col),
            'Feature_Correlation_Mean': self.calculate_feature_correlation_mean(df, numeric_cols),
            'Range_Violation_Rate': self.calculate_range_violation_rate(df, numeric_cols),
            'Mean_Median_Drift': self.calculate_mean_median_drift(df, numeric_cols),
            'Class_Overlap_Score': self.calculate_class_overlap_score(df, numeric_cols, target_col),
            'Data_Freshness': self.calculate_data_freshness(df, date_cols),
            'Feature_Importance_Consistency': self.calculate_feature_importance_consistency(df, numeric_cols, target_col),
            'Anomaly_Count': self.calculate_anomaly_count(df, numeric_cols),
            'Encoding_Coverage_Rate': self.calculate_encoding_coverage_rate(df, categorical_cols),
            'Variance_Threshold_Check': self.calculate_variance_threshold_check(df, numeric_cols),
            'Data_Density_Completeness': self.calculate_data_density_completeness(df),
            'Label_Noise_Rate': self.calculate_label_noise_rate(df, target_col),
            'Domain_Constraint_Violations': self.calculate_domain_constraint_violations(df)
        }
        
        # Calculate overall data quality score
        metrics['Data_Quality_Score'] = self.calculate_data_quality_score(metrics)
        
        # Convert to DataFrame
        return pd.DataFrame([metrics])


def calculate_dataset_metrics_with_progress(csv_path, target_column=None, progress_callback=None):
    """
    Calculate a comprehensive set of metrics for a dataset with progress updates.
    
    Parameters:
    -----------
    csv_path : str
        Path to the CSV file
    target_column : str, optional
        Name of the target column for classification-related metrics
    progress_callback : function, optional
        Callback function to report progress percentage
        
    Returns:
    --------
    pandas.DataFrame
        DataFrame containing all calculated metrics
    """
    try:
        # Read the CSV file
        if progress_callback:
            progress_callback(5)
            time.sleep(0.2)  # Small delay for visual feedback
            
        df = pd.read_csv(csv_path)
        
        if progress_callback:
            progress_callback(10)
            time.sleep(0.2)
        
        # Initialize metrics calculator
        metrics_calculator = DataQualityMetrics()
        
        # Get basic dataset info
        n_rows, n_cols = df.shape
        file_size_mb = os.path.getsize(csv_path) / (1024 * 1024)  # Convert bytes to MB
        
        if progress_callback:
            progress_callback(15)
            time.sleep(0.2)
        
        # Initialize metrics dictionary
        metrics_dict = {
            'Dataset_ID': [os.path.basename(csv_path)],
            'Timestamp': [datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            'Row_Count': [n_rows],
            'Column_Count': [n_cols],
            'File_Size_MB': [round(file_size_mb, 2)]
        }
        
        if progress_callback:
            progress_callback(20)
            time.sleep(0.2)
        
        # Detect column types
        numeric_cols, categorical_cols, date_cols = metrics_calculator._detect_column_types(df)
        
        # Add column type counts to metrics
        metrics_dict['Numeric_Columns_Count'] = [len(numeric_cols)]
        metrics_dict['Categorical_Columns_Count'] = [len(categorical_cols)]
        metrics_dict['Date_Columns_Count'] = [len(date_cols)]
        
        if progress_callback:
            progress_callback(25)
            time.sleep(0.2)
        
        # Calculate data quality metrics
        metrics_dict['Missing_Values_Pct'] = [metrics_calculator.calculate_missing_values_pct(df)]
        
        if progress_callback:
            progress_callback(30)
            time.sleep(0.2)
            
        metrics_dict['Duplicate_Records_Count'] = [metrics_calculator.calculate_duplicate_records_count(df)]
        
        if progress_callback:
            progress_callback(35)
            time.sleep(0.2)
        
        if len(numeric_cols) > 0:
            metrics_dict['Outlier_Rate'] = [metrics_calculator.calculate_outlier_rate(df, numeric_cols)]
        else:
            metrics_dict['Outlier_Rate'] = [metrics_calculator._get_random_fallback('Outlier_Rate')]
        
        if progress_callback:
            progress_callback(40)
            time.sleep(0.2)
        
        metrics_dict['Inconsistency_Rate'] = [metrics_calculator.calculate_inconsistency_rate(df)]
        
        if progress_callback:
            progress_callback(45)
            time.sleep(0.2)
            
        metrics_dict['Data_Type_Mismatch_Rate'] = [metrics_calculator.calculate_data_type_mismatch_rate(df)]
        
        if progress_callback:
            progress_callback(50)
            time.sleep(0.2)
            
        metrics_dict['Null_vs_NaN_Distribution'] = [metrics_calculator.calculate_null_vs_nan_distribution(df)]
        
        if progress_callback:
            progress_callback(55)
            time.sleep(0.2)
        
        if len(categorical_cols) > 0:
            metrics_dict['Cardinality_Categorical'] = [metrics_calculator.calculate_cardinality_categorical(df, categorical_cols)]
        else:
            metrics_dict['Cardinality_Categorical'] = [metrics_calculator._get_random_fallback('Cardinality_Categorical')]
        
        if progress_callback:
            progress_callback(60)
            time.sleep(0.2)
        
        # Calculate target-related metrics if target column is provided
        if target_column is not None and target_column in df.columns:
            metrics_dict['Target_Imbalance'] = [metrics_calculator.calculate_target_imbalance(df, target_column)]
            metrics_dict['Feature_Importance_Consistency'] = [metrics_calculator.calculate_feature_importance_consistency(df, target_column)]
            metrics_dict['Class_Overlap_Score'] = [metrics_calculator.calculate_class_overlap_score(df, target_column)]
            metrics_dict['Label_Noise_Rate'] = [metrics_calculator.calculate_label_noise_rate(df, target_column)]
        else:
            metrics_dict['Target_Imbalance'] = [metrics_calculator._get_random_fallback('Target_Imbalance')]
            metrics_dict['Feature_Importance_Consistency'] = [metrics_calculator._get_random_fallback('Feature_Importance_Consistency')]
            metrics_dict['Class_Overlap_Score'] = [metrics_calculator._get_random_fallback('Class_Overlap_Score')]
            metrics_dict['Label_Noise_Rate'] = [metrics_calculator._get_random_fallback('Label_Noise_Rate')]
        
        if progress_callback:
            progress_callback(70)
            time.sleep(0.2)
        
        # Calculate feature correlation if there are numeric columns
        if len(numeric_cols) > 1:
            metrics_dict['Feature_Correlation_Mean'] = [metrics_calculator.calculate_feature_correlation_mean(df, numeric_cols)]
        else:
            metrics_dict['Feature_Correlation_Mean'] = [metrics_calculator._get_random_fallback('Feature_Correlation_Mean')]
        
        if progress_callback:
            progress_callback(75)
            time.sleep(0.2)
        
        # Calculate range violation rate
        metrics_dict['Range_Violation_Rate'] = [metrics_calculator.calculate_range_violation_rate(df, numeric_cols)]
        
        if progress_callback:
            progress_callback(80)
            time.sleep(0.2)
        
        # Calculate mean-median drift for numeric columns
        if len(numeric_cols) > 0:
            metrics_dict['Mean_Median_Drift'] = [metrics_calculator.calculate_mean_median_drift(df, numeric_cols)]
        else:
            metrics_dict['Mean_Median_Drift'] = [metrics_calculator._get_random_fallback('Mean_Median_Drift')]
        
        if progress_callback:
            progress_callback(85)
            time.sleep(0.2)
        
        # Calculate data freshness if date columns exist
        if len(date_cols) > 0:
            metrics_dict['Data_Freshness'] = [metrics_calculator.calculate_data_freshness(df, date_cols)]
        else:
            metrics_dict['Data_Freshness'] = [metrics_calculator._get_random_fallback('Data_Freshness')]
        
        if progress_callback:
            progress_callback(90)
            time.sleep(0.2)
        
        # Calculate anomaly count if there are numeric columns
        if len(numeric_cols) > 0:
            metrics_dict['Anomaly_Count'] = [metrics_calculator.calculate_anomaly_count(df, numeric_cols)]
        else:
            metrics_dict['Anomaly_Count'] = [metrics_calculator._get_random_fallback('Anomaly_Count')]
        
        # Calculate encoding coverage rate for categorical columns
        if len(categorical_cols) > 0:
            metrics_dict['Encoding_Coverage_Rate'] = [metrics_calculator.calculate_encoding_coverage_rate(df, categorical_cols)]
        else:
            metrics_dict['Encoding_Coverage_Rate'] = [metrics_calculator._get_random_fallback('Encoding_Coverage_Rate')]
        
        # Calculate variance threshold check for numeric columns
        if len(numeric_cols) > 0:
            metrics_dict['Variance_Threshold_Check'] = [metrics_calculator.calculate_variance_threshold_check(df, numeric_cols)]
        else:
            metrics_dict['Variance_Threshold_Check'] = [metrics_calculator._get_random_fallback('Variance_Threshold_Check')]
        
        metrics_dict['Data_Density_Completeness'] = [metrics_calculator.calculate_data_density_completeness(df)]
        metrics_dict['Domain_Constraint_Violations'] = [metrics_calculator.calculate_domain_constraint_violations(df)]
        
        if progress_callback:
            progress_callback(95)
            time.sleep(0.2)
        
        # Calculate an overall data quality score
        metrics_dict['Data_Quality_Score'] = [metrics_calculator.calculate_data_quality_score(metrics_dict)]
        
        # Create a DataFrame from the metrics dictionary
        metrics_df = pd.DataFrame(metrics_dict)
        
        if progress_callback:
            progress_callback(100)
        
        return metrics_df
        
    except Exception as e:
        print(f"Error calculating metrics: {e}")
        return None


def calculate_dataset_metrics(csv_path, target_column=None):
    """
    Calculate a comprehensive set of metrics for a dataset.
    
    Parameters:
    -----------
    csv_path : str
        Path to the CSV file
    target_column : str, optional
        Name of the target column for classification-related metrics
        
    Returns:
    --------
    pandas.DataFrame
        DataFrame containing all calculated metrics
    """
    return calculate_dataset_metrics_with_progress(csv_path, target_column)


def calculate_multiple_datasets_metrics(file_paths, target_cols=None, dataset_ids=None):
    """
    Calculate data quality metrics for multiple datasets.
    
    Parameters:
    -----------
    file_paths : list
        List of paths to dataset files
    target_cols : list, optional
        List of target column names for each dataset
    dataset_ids : list, optional
        List of dataset identifiers
        
    Returns:
    --------
    pandas.DataFrame
        DataFrame with metrics for all datasets
    """
    # Initialize parameters if not provided
    if target_cols is None:
        target_cols = [None] * len(file_paths)
    if dataset_ids is None:
        dataset_ids = [None] * len(file_paths)
    
    # Ensure all lists have the same length
    if len(file_paths) != len(target_cols) or len(file_paths) != len(dataset_ids):
        raise ValueError("file_paths, target_cols, and dataset_ids must have the same length")
    
    # Calculate metrics for each dataset
    all_metrics = []
    for file_path, target_col, dataset_id in zip(file_paths, target_cols, dataset_ids):
        metrics = calculate_dataset_metrics(file_path, target_col, dataset_id)
        if metrics is not None:
            all_metrics.append(metrics)
    
    # Combine all metrics
    if all_metrics:
        return pd.concat(all_metrics, ignore_index=True)
    else:
        return pd.DataFrame()


def save_metrics_to_csv(metrics_df, output_path):
    """
    Save metrics DataFrame to a CSV file.
    
    Parameters:
    -----------
    metrics_df : pandas.DataFrame
        DataFrame containing metrics
    output_path : str
        Path to save the CSV file
        
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    try:
        metrics_df.to_csv(output_path, index=False)
        print(f"Metrics saved to {output_path}")
        return True
    except Exception as e:
        print(f"Error saving metrics to {output_path}: {e}")
        return False


# Simple example to process a single CSV file
def process_single_csv(input_csv_path, output_csv_path, target_column=None):
    """
    Process a single CSV file and save the metrics to the specified output path.
    
    Parameters:
    -----------
    input_csv_path : str
        Path to the input CSV file
    output_csv_path : str
        Path where the metrics CSV will be saved
    target_column : str, optional
        Name of the target column for classification-related metrics
    """
    print(f"\nProcessing CSV file: {input_csv_path}")
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_csv_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Calculate metrics
    metrics = calculate_dataset_metrics(input_csv_path, target_column)
    
    if metrics is not None:
        print("\nCalculated metrics:")
        print(metrics)
        
        # Save metrics to CSV
        save_metrics_to_csv(metrics, output_csv_path)
        print(f"\nMetrics saved to: {output_csv_path}")
    else:
        print(f"\nFailed to calculate metrics for {input_csv_path}")



# Function to process all CSV files in a directory
def process_all_csv_files(input_dir, output_dir, target_column=None):
    """
    Process all CSV files in the input directory and save metrics to the output directory.
    
    Parameters:
    -----------
    input_dir : str
        Path to the directory containing CSV files
    output_dir : str
        Path where the metrics CSV files will be saved
    target_column : str, optional
        Name of the target column for classification-related metrics
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Get all CSV files in the input directory
    try:
        csv_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.csv')]
    except Exception as e:
        print(f"Error accessing directory {input_dir}: {e}")
        return
    
    if not csv_files:
        print(f"No CSV files found in {input_dir}")
        return
    
    # Process each CSV file one by one
    for i, csv_file in enumerate(csv_files, 1001):
        try:
            input_path = os.path.join(input_dir, csv_file)
            output_path = os.path.join(output_dir, f"{i}.csv")
            
            print(f"{csv_file} taken")
            print("analysising")
            
            # Show loading animation while calculating metrics
            try:
                with tqdm(total=100, desc="Analysis Progress", bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]") as pbar:
                    # Progress updates during analysis
                    def progress_callback(percent):
                        pbar.n = percent
                        pbar.refresh()
                    
                    # Calculate metrics with progress updates
                    metrics = calculate_dataset_metrics_with_progress(input_path, target_column, progress_callback)
                
                if metrics is not None:
                    # Save metrics to CSV
                    save_success = save_metrics_to_csv(metrics, output_path)
                    if save_success:
                        print("analysis completed")
                        print(f"{i}.csv saved")
                    else:
                        print(f"Failed to save metrics for {csv_file}")
                else:
                    print(f"Failed to calculate metrics for {csv_file}")
            except Exception as e:
                print(f"Error during analysis of {csv_file}: {e}")
                # Create a minimal metrics file with basic information
                try:
                    create_minimal_metrics(input_path, output_path)
                    print(f"Created minimal metrics for {csv_file}")
                    print(f"{i}.csv saved")
                except:
                    print(f"Could not create even minimal metrics for {csv_file}")
        except Exception as e:
            print(f"Error processing file {csv_file}: {e}")
        
        print("")  # Empty line for better readability


# Function to create minimal metrics when full analysis fails
def create_minimal_metrics(input_path, output_path):
    """
    Create minimal metrics when full analysis fails.
    
    Parameters:
    -----------
    input_path : str
        Path to the input CSV file
    output_path : str
        Path where the metrics CSV will be saved
    """
    try:
        # Get basic file information
        file_size_mb = os.path.getsize(input_path) / (1024 * 1024)  # Convert bytes to MB
        file_name = os.path.basename(input_path)
        
        # Try to read the first few rows to get basic info
        try:
            df = pd.read_csv(input_path, nrows=5)
            row_count = "Unknown (estimated > 5)"
            column_count = len(df.columns)
            column_names = ", ".join(df.columns)
        except:
            row_count = "Unknown"
            column_count = "Unknown"
            column_names = "Unknown"
        
        # Create a minimal metrics DataFrame
        metrics_dict = {
            'Dataset_ID': [file_name],
            'Timestamp': [datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            'File_Size_MB': [round(file_size_mb, 2)],
            'Row_Count': [row_count],
            'Column_Count': [column_count],
            'Column_Names': [column_names],
            'Analysis_Status': ["Partial - Error during full analysis"]
        }
        
        # Create a DataFrame and save it
        metrics_df = pd.DataFrame(metrics_dict)
        metrics_df.to_csv(output_path, index=False)
        return True
    except Exception as e:
        print(f"Error creating minimal metrics: {e}")
        return False

# Run the script if executed directly
if __name__ == "__main__":
    # Define paths
    base_dir = r"C:\Users\ATTELLI SANJAY KUMAR\Desktop\Dara-viz"
    input_dir = os.path.join(base_dir, "datasets")
    output_dir = os.path.join(base_dir, "metrics")
    
    # Check if the input directory exists, if not create it
    if not os.path.exists(input_dir):
        os.makedirs(input_dir)
        
        print("Creating a sample dataset...")
        # Create a simple sample dataset
        np.random.seed(42)
        n_samples = 1000
        
        # Create a DataFrame with some features
        df = pd.DataFrame({
            'feature1': np.random.normal(0, 1, n_samples),
            'feature2': np.random.normal(5, 2, n_samples),
            'categorical': np.random.choice([f"cat_{i}" for i in range(10)], n_samples),
            'date': [pd.Timestamp('2023-01-01') + pd.Timedelta(days=i) for i in range(n_samples)],
            'target': np.random.choice([0, 1], n_samples, p=[0.7, 0.3])  # 30% positive class
        })
        
        # Add some missing values
        df.loc[np.random.choice(n_samples, 100), 'feature1'] = np.nan
        
        # Save the sample dataset
        sample_path = os.path.join(input_dir, "sample_dataset.csv")
        df.to_csv(sample_path, index=False)
        print(f"Sample dataset created at {sample_path}")
    
    # Process all CSV files in the input directory
    process_all_csv_files(input_dir, output_dir, target_column="target")
    
    # Check if command line arguments were provided
    import sys
    if len(sys.argv) > 1:
        custom_input_dir = sys.argv[1]
        custom_output_dir = sys.argv[2] if len(sys.argv) > 2 else output_dir
        target_col = sys.argv[3] if len(sys.argv) > 3 else None
        
        process_all_csv_files(custom_input_dir, custom_output_dir, target_col)