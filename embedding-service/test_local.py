#!/usr/bin/env python3
"""
Test script for the embedding service
Run this to verify the service works locally before deployment
"""

import requests
import json
import time

def test_health():
    """Test the health endpoint"""
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health check status: {response.status_code}")
        print(f"Health check response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_embedding():
    """Test the embedding endpoint"""
    try:
        data = {"texts": ["Hello world", "This is a test"]}
        response = requests.post("http://localhost:8000/embed", json=data)
        print(f"Embedding status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Generated {len(result['embeddings'])} embeddings")
            print(f"Each embedding has {len(result['embeddings'][0])} dimensions")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Embedding test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing embedding service...")
    
    # Wait a bit for the service to start
    print("Waiting for service to be ready...")
    time.sleep(5)
    
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    health_ok = test_health()
    
    # Test embedding endpoint
    print("\n2. Testing embedding endpoint...")
    embedding_ok = test_embedding()
    
    if health_ok and embedding_ok:
        print("\n✅ All tests passed! Service is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the service logs.") 