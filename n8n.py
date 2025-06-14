import requests
import json
import time

url = 'https://n8n-n91d.onrender.com/webhook/n8n-dataviz'

payload = {
    "input": (
        "What preprocessing steps should I apply if I have 7.2% missing values, "
        "95 duplicate rows, 0.12 outlier rate, and encoding coverage of 92%?"
    ),
    "metrics": {
        "Missing_Values_Pct": 7.2,
        "Duplicate_Records_Count": 95,
        "Outlier_Rate": 0.12,
        "Null_vs_NaN_Distribution": 0.3,
        "Encoding_Coverage_Rate": 0.92
    }
}

headers = {
    "Content-Type": "application/json"
}

print("Making request to:", url)
print("Payload:", json.dumps(payload, indent=2))
print("Headers:", headers)
print("-" * 50)

try:
    # Add timeout and more detailed error handling
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    
    print("Status Code:", response.status_code)
    print("Response Headers:", dict(response.headers))
    print("Content Length:", len(response.content))
    print("Response Encoding:", response.encoding)
    
    # Check if response is empty
    if not response.content:
        print("ERROR: Response is completely empty!")
        exit()
    
    print("Raw Response Text (first 500 chars):")
    print(repr(response.text[:500]))
    
    # Try to parse JSON
    try:
        json_response = response.json()
        print("\nJSON Response:")
        print(json.dumps(json_response, indent=2))
    except requests.exceptions.JSONDecodeError as e:
        print(f"\nCouldn't parse JSON response: {str(e)}")
        print("Full raw response:")
        print(response.text)
        
        # Check if it's HTML error page
        if response.text.strip().startswith('<'):
            print("Response appears to be HTML - likely an error page")
        
except requests.exceptions.Timeout:
    print("Request timed out after 30 seconds")
except requests.exceptions.ConnectionError as e:
    print(f"Connection error: {str(e)}")
except requests.exceptions.RequestException as e:
    print(f"Request error: {str(e)}")