#!/usr/bin/env python3
"""
Data Quality Prediction API Test Script
Tests the deployed model API with sample data and displays formatted results
"""

import requests
import json
import sys
from datetime import datetime
import pandas as pd

class DataQualityAPITester:
    def __init__(self, base_url):
        """Initialize the API tester with base URL"""
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def test_health(self):
        """Test the health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                print("✅ Health Check: API is running")
                return True
            else:
                print(f"❌ Health Check Failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health Check Error: {e}")
            return False
    
    def get_metadata(self):
        """Get model metadata"""
        try:
            response = self.session.get(f"{self.base_url}/metadata")
            if response.status_code == 200:
                metadata = response.json()
                print("✅ Metadata Retrieved Successfully")
                print(f"   Input Features: {len(metadata['input_features'])}")
                print(f"   Metric Features: {len(metadata['metric_score_features'])}")
                print(f"   Label Classes: {metadata['label_classes']}")
                return metadata
            else:
                print(f"❌ Metadata Failed: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Metadata Error: {e}")
            return None
    
    def get_sample_input(self):
        """Get sample input format"""
        try:
            response = self.session.get(f"{self.base_url}/sample-input")
            if response.status_code == 200:
                return response.json()['sample_input']
            else:
                print(f"❌ Sample Input Failed: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Sample Input Error: {e}")
            return None
    
        def create_sample_data(self):
            """Create sample data matching your web interface"""
            return {
                "Row_Count": 50000,
                "Column_Count": 20,
                "File_Size_MB": 45.2, 
                "Numeric_Columns_Count": 14,
                "Categorical_Columns_Count": 4,
                "Date_Columns_Count": 2,
                "Missing_Values_Pct": 1.2,
                "Duplicate_Records_Count": 20,
                "Outlier_Rate": 0.02,
                "Inconsistency_Rate": 0.01,
                "Data_Type_Mismatch_Rate": 0.005,
                "Null_vs_NaN_Distribution": 0.9,
                "Cardinality_Categorical": 50,
                "Target_Imbalance": 0.48,
                "Feature_Importance_Consistency": 0.92,
                "Class_Overlap_Score": 0.1,
                "Label_Noise_Rate": 0.01,
                "Feature_Correlation_Mean": 0.3,
                "Range_Violation_Rate": 0.005,
                "Mean_Median_Drift": 0.05,
                "Data_Freshness": 0.98,
                "Anomaly_Count": 15,
                "Encoding_Coverage_Rate": 0.99,
                "Variance_Threshold_Check": 0.95,
                "Data_Density_Completeness": 0.98,
                "Domain_Constraint_Violations": 5
            }
    
    def create_random_data(self):
        """Create random data within typical ranges"""
        import random
        
        return {
            "Row_Count": random.randint(1000, 80000),
            "Column_Count": random.randint(10, 50),
            "File_Size_MB": round(random.uniform(5.0, 500.0), 2),
            "Numeric_Columns_Count": random.randint(5, 30),
            "Categorical_Columns_Count": random.randint(2, 15),
            "Date_Columns_Count": random.randint(0, 5),
            "Missing_Values_Pct": round(random.uniform(0.0, 25.0), 2),
            "Duplicate_Records_Count": random.randint(0, 1000),
            "Outlier_Rate": round(random.uniform(0.0, 0.3), 3),
            "Inconsistency_Rate": round(random.uniform(0.0, 0.2), 3),
            "Data_Type_Mismatch_Rate": round(random.uniform(0.0, 0.1), 3),
            "Null_vs_NaN_Distribution": round(random.uniform(0.5, 1.0), 2),
            "Cardinality_Categorical": random.randint(10, 200),
            "Target_Imbalance": round(random.uniform(0.3, 0.7), 2),
            "Feature_Importance_Consistency": round(random.uniform(0.7, 1.0), 2),
            "Class_Overlap_Score": round(random.uniform(0.0, 0.5), 2),
            "Label_Noise_Rate": round(random.uniform(0.0, 0.1), 3),
            "Feature_Correlation_Mean": round(random.uniform(0.1, 0.8), 2),
            "Range_Violation_Rate": round(random.uniform(0.0, 0.1), 3),
            "Mean_Median_Drift": round(random.uniform(0.0, 0.2), 3),
            "Data_Freshness": round(random.uniform(0.8, 1.0), 2),
            "Anomaly_Count": random.randint(0, 100),
            "Encoding_Coverage_Rate": round(random.uniform(0.9, 1.0), 2),
            "Variance_Threshold_Check": round(random.uniform(0.8, 1.0), 2),
            "Data_Density_Completeness": round(random.uniform(0.85, 1.0), 2),
            "Domain_Constraint_Violations": random.randint(0, 50)
        }
    
    def predict_quality(self, input_data):
        """Make prediction using the API"""
        try:
            response = self.session.post(f"{self.base_url}/predict", json=input_data)
            
            if response.status_code == 200:
                return response.json(), True
            else:
                print(f"❌ Prediction Failed: {response.status_code}")
                try:
                    error_msg = response.json()
                    print(f"   Error: {error_msg}")
                except:
                    print(f"   Response: {response.text}")
                return None, False
        except Exception as e:
            print(f"❌ Prediction Error: {e}")
            return None, False
    
    def format_metric_name(self, metric_name):
        """Format metric name for display"""
        return metric_name.replace('_', ' ').title()
    
    def get_quality_status(self, score):
        """Get quality status based on score"""
        if score >= 90:
            return "Excellent", "🟢"
        elif score >= 70:
            return "Good", "🔵"
        elif score >= 50:
            return "Moderate", "🟡"
        else:
            return "Poor", "🔴"
    
    def display_results(self, results, input_data):
        """Display formatted results matching web interface"""
        print("\n" + "="*80)
        print("📊 DATA QUALITY PREDICTION RESULTS")
        print("="*80)
        
        # Overall Quality Score
        overall_score = results['overall_score']
        status, emoji = self.get_quality_status(overall_score)
        
        print(f"\n🎯 OVERALL QUALITY SCORE")
        print(f"   Score: {overall_score:.1f}/100 {emoji}")
        print(f"   Status: {status}")
        
        if 'score_note' in results:
            print(f"   Note: {results['score_note']}")
        
        # Quality Label with Probabilities
        print(f"\n🏷️  QUALITY LABEL")
        print(f"   Predicted Label: {results['quality_label']}")
        print(f"   Label Probabilities:")
        
        for label, prob in results['label_probabilities'].items():
            bar_length = int(prob * 20)  # Scale to 20 characters
            bar = "█" * bar_length + "░" * (20 - bar_length)
            print(f"      {label:10} {bar} {prob*100:5.1f}%")
        
        # Top Issues
        print(f"\n⚠️  TOP ISSUES")
        for i, (metric, score) in enumerate(results['top_issues'].items(), 1):
            status, emoji = self.get_quality_status(score)
            print(f"   {i}. {self.format_metric_name(metric)}: {score:.1f} {emoji}")
        
        # Metric Scores Summary
        print(f"\n📈 METRIC SCORES SUMMARY")
        metric_scores = results['metric_scores']
        
        # Sort metrics by score
        sorted_metrics = sorted(metric_scores.items(), key=lambda x: x[1])
        
        # Show worst 5 and best 5
        print(f"   📉 Worst Performing Metrics:")
        for metric, score in sorted_metrics[:5]:
            status, emoji = self.get_quality_status(score)
            print(f"      {self.format_metric_name(metric):30} {score:6.1f} {emoji}")
        
        print(f"   📈 Best Performing Metrics:")
        for metric, score in sorted_metrics[-5:]:
            status, emoji = self.get_quality_status(score)
            print(f"      {self.format_metric_name(metric):30} {score:6.1f} {emoji}")
        
        # Additional Information
        if 'metrics_capped' in results:
            print(f"\n⚠️  METRICS CAPPED AT 100:")
            for metric, original_score in results['metrics_capped'].items():
                print(f"      {self.format_metric_name(metric)}: {original_score:.1f} → 100.0")
        
        print(f"\n⏰ Prediction Time: {results['prediction_time']}")
        
        # Input Data Summary
        print(f"\n📋 INPUT DATA SUMMARY")
        print(f"   Dataset Size: {input_data['Row_Count']:,} rows × {input_data['Column_Count']} columns")
        print(f"   File Size: {input_data['File_Size_MB']:.1f} MB")
        print(f"   Missing Values: {input_data['Missing_Values_Pct']:.1f}%")
        print(f"   Duplicate Records: {input_data['Duplicate_Records_Count']:,}")
        print(f"   Outlier Rate: {input_data['Outlier_Rate']:.3f}")
    
    def display_detailed_metrics(self, results):
        """Display all metric scores in a detailed table"""
        print(f"\n📊 ALL METRIC SCORES (Detailed)")
        print("-" * 60)
        print(f"{'Metric Name':<35} {'Score':<8} {'Status':<10}")
        print("-" * 60)
        
        # Sort metrics by score (ascending)
        sorted_metrics = sorted(results['metric_scores'].items(), key=lambda x: x[1])
        
        for metric, score in sorted_metrics:
            status, emoji = self.get_quality_status(score)
            print(f"{self.format_metric_name(metric):<35} {score:6.1f}   {status} {emoji}")
        
        print("-" * 60)
        print(f"Total Metrics: {len(results['metric_scores'])}")
    
    def save_results_to_csv(self, results, input_data, filename=None):
        """Save results to CSV file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"quality_prediction_results_{timestamp}.csv"
        
        # Prepare data for CSV
        data = []
        
        # Add overall results
        data.append({
            'Category': 'Overall',
            'Metric': 'Quality Score',
            'Value': results['overall_score'],
            'Status': self.get_quality_status(results['overall_score'])[0]
        })
        
        data.append({
            'Category': 'Overall',
            'Metric': 'Quality Label',
            'Value': results['quality_label'],
            'Status': results['quality_label']
        })
        
        # Add metric scores
        for metric, score in results['metric_scores'].items():
            data.append({
                'Category': 'Metric Score',
                'Metric': self.format_metric_name(metric),
                'Value': score,
                'Status': self.get_quality_status(score)[0]
            })
        
        # Add input features
        for feature, value in input_data.items():
            data.append({
                'Category': 'Input Feature',
                'Metric': self.format_metric_name(feature),
                'Value': value,
                'Status': 'Input'
            })
        
        # Create DataFrame and save
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False)
        print(f"\n💾 Results saved to: {filename}")
        return filename

def main():
    """Main function to run the API test"""
    print("🚀 Data Quality Prediction API Tester")
    print("="*50)
    
    # Get API URL from user or use default
    api_url = "https://data-viz-ai-model.onrender.com"

    
    # Initialize tester
    tester = DataQualityAPITester(api_url)
    
    # Test health
    if not tester.test_health():
        print("❌ API is not accessible. Please check the URL and try again.")
        return
    
    # Get metadata
    metadata = tester.get_metadata()
    if not metadata:
        print("⚠️  Could not retrieve metadata, continuing with test...")
    
    while True:
        print("\n" + "="*50)
        print("🎯 TEST OPTIONS")
        print("1. Test with sample data (high quality)")
        print("2. Test with random data")
        print("3. Test with custom data")
        print("4. Display API metadata")
        print("5. Exit")
        print("="*50)
        
        choice = input("Select option (1-5): ").strip()
        
        if choice == '1':
            print("\n🧪 Testing with Sample Data...")
            input_data = tester.create_sample_data()
            
        elif choice == '2':
            print("\n🎲 Testing with Random Data...")
            input_data = tester.create_random_data()
            
        elif choice == '3':
            print("\n✏️  Custom Data Input")
            print("Enter values for each feature (press Enter for default):")
            input_data = {}
            sample_data = tester.create_sample_data()
            
            for feature, default_value in sample_data.items():
                user_input = input(f"{tester.format_metric_name(feature)} [{default_value}]: ").strip()
                if user_input:
                    try:
                        input_data[feature] = float(user_input) if '.' in user_input else int(user_input)
                    except ValueError:
                        input_data[feature] = default_value
                        print(f"   Invalid input, using default: {default_value}")
                else:
                    input_data[feature] = default_value
        
        elif choice == '4':
            if metadata:
                print("\n📋 MODEL METADATA")
                print(f"Input Features ({len(metadata['input_features'])}):")
                for i, feature in enumerate(metadata['input_features'], 1):
                    print(f"   {i:2d}. {tester.format_metric_name(feature)}")
                
                print(f"\nMetric Score Features ({len(metadata['metric_score_features'])}):")
                for i, feature in enumerate(metadata['metric_score_features'], 1):
                    print(f"   {i:2d}. {tester.format_metric_name(feature.replace('_Score', ''))}")
                
                print(f"\nLabel Classes: {metadata['label_classes']}")
                print(f"Model Version: {metadata.get('model_version', 'Unknown')}")
                print(f"Training Timestamp: {metadata.get('training_timestamp', 'Unknown')}")
            else:
                print("❌ Metadata not available")
            continue
        
        elif choice == '5':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please select 1-5.")
            continue
        
        # Make prediction
        print(f"\n🔮 Making Prediction...")
        results, success = tester.predict_quality(input_data)
        
        if success and results:
            # Display results
            tester.display_results(results, input_data)
            
            # Ask if user wants detailed metrics
            show_detailed = input("\n❓ Show detailed metrics table? (y/N): ").strip().lower()
            if show_detailed in ['y', 'yes']:
                tester.display_detailed_metrics(results)
            
            # Ask if user wants to save results
            save_results = input("\n❓ Save results to CSV? (y/N): ").strip().lower()
            if save_results in ['y', 'yes']:
                tester.save_results_to_csv(results, input_data)
        
        else:
            print("❌ Prediction failed. Please check the API and try again.")
        
        # Ask if user wants to continue
        continue_test = input("\n❓ Run another test? (Y/n): ").strip().lower()
        if continue_test in ['n', 'no']:
            break
    
    print("\n✅ Testing completed!")

if __name__ == "__main__":
    main()