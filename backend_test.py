#!/usr/bin/env python3
"""
EverFreeNote Backend API Testing Suite
Tests all authentication and notes CRUD endpoints
"""

import requests
import json
import os
from urllib.parse import urlparse, parse_qs

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://everfreenote.example.com')
API_BASE = f"{BASE_URL}/api"

class EverFreeNoteAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def test_cors_headers(self, response):
        """Check if CORS headers are present"""
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods', 
            'Access-Control-Allow-Headers'
        ]
        
        missing_headers = []
        for header in cors_headers:
            if header not in response.headers:
                missing_headers.append(header)
                
        if missing_headers:
            print(f"❌ Missing CORS headers: {missing_headers}")
            return False
        else:
            print("✅ CORS headers present")
            return True

    def test_auth_signin_google(self):
        """Test Google OAuth sign-in endpoint"""
        print("\n🔐 Testing Google OAuth Sign-in Endpoint...")
        
        try:
            response = self.session.post(f"{API_BASE}/auth/signin/google")
            print(f"Status Code: {response.status_code}")
            
            # Check CORS headers
            self.test_cors_headers(response)
            
            if response.status_code == 200:
                data = response.json()
                if 'url' in data and data['url']:
                    # Validate OAuth URL structure
                    oauth_url = data['url']
                    parsed_url = urlparse(oauth_url)
                    
                    if 'supabase.co' in parsed_url.netloc and 'auth/v1/authorize' in parsed_url.path:
                        print("✅ Google OAuth endpoint working - returns valid OAuth URL")
                        print(f"OAuth URL: {oauth_url[:100]}...")
                        return True
                    else:
                        print(f"❌ Invalid OAuth URL format: {oauth_url}")
                        return False
                else:
                    print("❌ Response missing OAuth URL")
                    print(f"Response: {data}")
                    return False
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception during Google OAuth test: {str(e)}")
            return False

    def test_auth_signout(self):
        """Test sign-out endpoint"""
        print("\n🚪 Testing Sign-out Endpoint...")
        
        try:
            response = self.session.post(f"{API_BASE}/auth/signout")
            print(f"Status Code: {response.status_code}")
            
            # Check CORS headers
            self.test_cors_headers(response)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    print("✅ Sign-out endpoint working")
                    return True
                else:
                    print("❌ Sign-out response missing success message")
                    print(f"Response: {data}")
                    return False
            else:
                print(f"❌ Sign-out failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception during sign-out test: {str(e)}")
            return False

    def test_auth_user_unauthenticated(self):
        """Test get current user endpoint without authentication"""
        print("\n👤 Testing Get Current User Endpoint (Unauthenticated)...")
        
        try:
            response = self.session.get(f"{API_BASE}/auth/user")
            print(f"Status Code: {response.status_code}")
            
            # Check CORS headers
            self.test_cors_headers(response)
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user'] is None:
                    print("✅ Get user endpoint working - returns null for unauthenticated user")
                    return True
                else:
                    print("❌ Unexpected response for unauthenticated user")
                    print(f"Response: {data}")
                    return False
            else:
                print(f"❌ Get user failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception during get user test: {str(e)}")
            return False

    def test_notes_unauthorized(self):
        """Test notes endpoints without authentication"""
        print("\n📝 Testing Notes Endpoints (Unauthorized Access)...")
        
        endpoints_to_test = [
            ('POST', f"{API_BASE}/notes", {'title': 'Test Note', 'description': 'Test Description'}),
            ('GET', f"{API_BASE}/notes", None),
            ('PUT', f"{API_BASE}/notes/test-id", {'title': 'Updated Note', 'description': 'Updated Description'}),
            ('DELETE', f"{API_BASE}/notes/test-id", None)
        ]
        
        all_unauthorized = True
        
        for method, url, data in endpoints_to_test:
            try:
                if method == 'POST':
                    response = self.session.post(url, json=data)
                elif method == 'GET':
                    response = self.session.get(url)
                elif method == 'PUT':
                    response = self.session.put(url, json=data)
                elif method == 'DELETE':
                    response = self.session.delete(url)
                
                print(f"{method} {url.split('/')[-1]}: Status {response.status_code}")
                
                # Check CORS headers
                self.test_cors_headers(response)
                
                if response.status_code == 401:
                    response_data = response.json()
                    if 'error' in response_data and 'Unauthorized' in response_data['error']:
                        print(f"✅ {method} endpoint properly returns 401 Unauthorized")
                    else:
                        print(f"❌ {method} endpoint returns 401 but wrong error message")
                        all_unauthorized = False
                else:
                    print(f"❌ {method} endpoint should return 401 but returned {response.status_code}")
                    all_unauthorized = False
                    
            except Exception as e:
                print(f"❌ Exception testing {method} endpoint: {str(e)}")
                all_unauthorized = False
        
        if all_unauthorized:
            print("✅ All notes endpoints properly require authentication")
        else:
            print("❌ Some notes endpoints have authorization issues")
            
        return all_unauthorized

    def test_notes_validation(self):
        """Test notes validation with invalid data"""
        print("\n🔍 Testing Notes Validation...")
        
        # Test create note with missing fields
        test_cases = [
            ({'description': 'Missing title'}, 'missing title'),
            ({'title': 'Missing description'}, 'missing description'),
            ({}, 'missing both fields'),
            ({'title': '', 'description': 'Empty title'}, 'empty title'),
            ({'title': 'Empty description', 'description': ''}, 'empty description')
        ]
        
        validation_working = True
        
        for invalid_data, test_name in test_cases:
            try:
                response = self.session.post(f"{API_BASE}/notes", json=invalid_data)
                print(f"Testing {test_name}: Status {response.status_code}")
                
                if response.status_code == 400:
                    response_data = response.json()
                    if 'error' in response_data:
                        print(f"✅ Validation working for {test_name}")
                    else:
                        print(f"❌ Missing error message for {test_name}")
                        validation_working = False
                elif response.status_code == 401:
                    print(f"✅ Properly returns 401 (unauthorized) for {test_name}")
                else:
                    print(f"❌ Unexpected status {response.status_code} for {test_name}")
                    validation_working = False
                    
            except Exception as e:
                print(f"❌ Exception testing validation for {test_name}: {str(e)}")
                validation_working = False
        
        return validation_working

    def test_search_functionality(self):
        """Test search functionality (without auth, should return 401)"""
        print("\n🔍 Testing Search Functionality...")
        
        search_queries = ['test', 'note', 'tag']
        
        for query in search_queries:
            try:
                response = self.session.get(f"{API_BASE}/notes?search={query}")
                print(f"Search query '{query}': Status {response.status_code}")
                
                # Check CORS headers
                self.test_cors_headers(response)
                
                if response.status_code == 401:
                    print(f"✅ Search properly requires authentication for query '{query}'")
                else:
                    print(f"❌ Search should return 401 but returned {response.status_code}")
                    return False
                    
            except Exception as e:
                print(f"❌ Exception testing search for '{query}': {str(e)}")
                return False
        
        print("✅ Search functionality properly requires authentication")
        return True

    def test_options_requests(self):
        """Test OPTIONS requests for CORS preflight"""
        print("\n🌐 Testing CORS Preflight (OPTIONS)...")
        
        endpoints = [
            f"{API_BASE}/auth/signin/google",
            f"{API_BASE}/auth/signout", 
            f"{API_BASE}/auth/user",
            f"{API_BASE}/notes"
        ]
        
        options_working = True
        
        for endpoint in endpoints:
            try:
                response = self.session.options(endpoint)
                print(f"OPTIONS {endpoint.split('/')[-1]}: Status {response.status_code}")
                
                if response.status_code == 200:
                    if self.test_cors_headers(response):
                        print(f"✅ OPTIONS working for {endpoint.split('/')[-1]}")
                    else:
                        print(f"❌ Missing CORS headers for {endpoint.split('/')[-1]}")
                        options_working = False
                else:
                    print(f"❌ OPTIONS failed for {endpoint.split('/')[-1]}")
                    options_working = False
                    
            except Exception as e:
                print(f"❌ Exception testing OPTIONS for {endpoint}: {str(e)}")
                options_working = False
        
        return options_working

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting EverFreeNote Backend API Tests")
        print(f"Testing API at: {API_BASE}")
        print("=" * 60)
        
        test_results = {}
        
        # Test authentication endpoints
        test_results['google_oauth'] = self.test_auth_signin_google()
        test_results['signout'] = self.test_auth_signout()
        test_results['get_user'] = self.test_auth_user_unauthenticated()
        
        # Test authorization
        test_results['notes_auth'] = self.test_notes_unauthorized()
        
        # Test validation
        test_results['validation'] = self.test_notes_validation()
        
        # Test search
        test_results['search'] = self.test_search_functionality()
        
        # Test CORS
        test_results['cors'] = self.test_options_requests()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend API tests passed!")
            return True
        else:
            print("⚠️  Some backend API tests failed")
            return False

if __name__ == "__main__":
    tester = EverFreeNoteAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)