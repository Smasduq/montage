import requests
import sys

try:
    response = requests.get("http://127.0.0.1:8000/api/v1/videos/")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Videos fetched successfully.")
        print(f"Count: {len(response.json())}")
        sys.exit(0)
    else:
        print(f"Failed to fetch videos. Response: {response.text}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print("Could not connect to server. Is it running?")
    sys.exit(1)
except Exception as e:
    print(f"An error occurred: {e}")
    sys.exit(1)
