#!/usr/bin/env python3
"""
Advanced EverFreeNote Backend API Testing
Tests edge cases and error handling
"""

import requests
import json

BASE_URL = 'http://localhost:3000'
API_BASE = f"{BASE_URL}/api"

class AdvancedAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def test_invalid_endpoints(self):
        """Test invalid API endpoints return 404"""
        print("\n🔍 Testing Invalid Endpoints...")
        
        invalid_endpoints = [
            f"{API_BASE}/invalid",
            f"{API_BASE}/auth/invalid",
            f"{API_BASE}/notes/invalid/action"
        ]
        
        all_404 = True
        
        for endpoint in invalid_endpoints:
            try:
                response = self.session.get(endpoint)
                print(f"GET {endpoint.split('/')[-1]}: Status {response.status_code}")
                
                if response.status_code == 404:
                    data = response.json()
                    if 'error' in data and 'Not found' in data['error']:
                        print(f"✅ Properly returns 404 for invalid endpoint")
                    else:
                        print(f"❌ 404 but wrong error message: {data}")
                        all_404 = False
                else:
                    print(f"❌ Should return 404 but returned {response.status_code}")
                    all_404 = False
                    
            except Exception as e:
                print(f"❌ Exception testing invalid endpoint: {str(e)}")
                all_404 = False
        
        return all_404

    def test_malformed_json(self):
        """Test malformed JSON handling"""
        print("\n📝 Testing Malformed JSON Handling...")
        
        try:
            # Send malformed JSON
            response = requests.post(
                f"{API_BASE}/notes",
                data="{ invalid json }",
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Malformed JSON: Status {response.status_code}")
            
            # Should return 400 or 500 for malformed JSON
            if response.status_code in [400, 401, 500]:
                print("✅ Properly handles malformed JSON")
                return True
            else:
                print(f"❌ Unexpected status for malformed JSON: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing malformed JSON: {str(e)}")
            return False

    def test_large_payload(self):
        """Test large payload handling"""
        print("\n📦 Testing Large Payload Handling...")
        
        try:
            # Create a large payload
            large_description = "A" * 10000  # 10KB description
            large_payload = {
                'title': 'Large Note',
                'description': large_description,
                'tags': ['large', 'test'] * 100  # Large tags array
            }
            
            response = self.session.post(f"{API_BASE}/notes", json=large_payload)
            print(f"Large payload: Status {response.status_code}")
            
            # Should handle large payloads gracefully (401 for auth or 413 for too large)
            if response.status_code in [401, 413, 400]:
                print("✅ Properly handles large payloads")
                return True
            else:
                print(f"❌ Unexpected status for large payload: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing large payload: {str(e)}")
            return False

    def test_sql_injection_attempts(self):
        """Test SQL injection protection"""
        print("\n🛡️  Testing SQL Injection Protection...")
        
        sql_payloads = [
            "'; DROP TABLE notes; --",
            "' OR '1'='1",
            "1' UNION SELECT * FROM users --"
        ]
        
        injection_safe = True
        
        for payload in sql_payloads:
            try:
                # Test in search parameter
                response = self.session.get(f"{API_BASE}/notes?search={payload}")
                print(f"SQL injection test: Status {response.status_code}")
                
                if response.status_code == 401:
                    print("✅ SQL injection attempt properly blocked by auth")
                elif response.status_code in [400, 500]:
                    print("✅ SQL injection attempt handled safely")
                else:
                    print(f"❌ Unexpected response to SQL injection: {response.status_code}")
                    injection_safe = False
                    
            except Exception as e:
                print(f"❌ Exception testing SQL injection: {str(e)}")
                injection_safe = False
        
        return injection_safe

    def test_xss_protection(self):
        """Test XSS protection in API responses"""
        print("\n🔒 Testing XSS Protection...")
        
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>"
        ]
        
        xss_safe = True
        
        for payload in xss_payloads:
            try:
                # Test XSS in note creation
                xss_data = {
                    'title': payload,
                    'description': f'Description with {payload}',
                    'tags': [payload]
                }
                
                response = self.session.post(f"{API_BASE}/notes", json=xss_data)
                print(f"XSS test: Status {response.status_code}")
                
                if response.status_code == 401:
                    print("✅ XSS attempt properly blocked by auth")
                elif response.status_code in [400, 500]:
                    print("✅ XSS attempt handled safely")
                else:
                    print(f"❌ Unexpected response to XSS: {response.status_code}")
                    xss_safe = False
                    
            except Exception as e:
                print(f"❌ Exception testing XSS: {str(e)}")
                xss_safe = False
        
        return xss_safe

    def test_rate_limiting_simulation(self):
        """Test rapid requests (basic rate limiting check)"""
        print("\n⚡ Testing Rapid Requests...")
        
        try:
            # Send multiple rapid requests
            responses = []
            for i in range(10):
                response = self.session.get(f"{API_BASE}/auth/user")
                responses.append(response.status_code)
            
            print(f"Rapid requests status codes: {set(responses)}")
            
            # All should return 200 (no rate limiting expected for this endpoint)
            if all(status == 200 for status in responses):
                print("✅ Handles rapid requests consistently")
                return True
            else:
                print("❌ Inconsistent responses to rapid requests")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing rapid requests: {str(e)}")
            return False

    def test_content_type_validation(self):
        """Test content type validation"""
        print("\n📋 Testing Content Type Validation...")
        
        try:
            # Send request without proper content type
            response = requests.post(
                f"{API_BASE}/notes",
                data=json.dumps({'title': 'Test', 'description': 'Test'}),
                headers={'Content-Type': 'text/plain'}
            )
            
            print(f"Wrong content type: Status {response.status_code}")
            
            # Should handle gracefully
            if response.status_code in [400, 401, 415]:
                print("✅ Properly validates content type")
                return True
            else:
                print(f"❌ Unexpected status for wrong content type: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Exception testing content type: {str(e)}")
            return False

    def run_advanced_tests(self):
        """Run all advanced security and edge case tests"""
        print("🔬 Starting Advanced EverFreeNote Backend Tests")
        print(f"Testing API at: {API_BASE}")
        print("=" * 60)
        
        test_results = {}
        
        # Run advanced tests
        test_results['invalid_endpoints'] = self.test_invalid_endpoints()
        test_results['malformed_json'] = self.test_malformed_json()
        test_results['large_payload'] = self.test_large_payload()
        test_results['sql_injection'] = self.test_sql_injection_attempts()
        test_results['xss_protection'] = self.test_xss_protection()
        test_results['rapid_requests'] = self.test_rate_limiting_simulation()
        test_results['content_type'] = self.test_content_type_validation()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 ADVANCED TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nAdvanced Tests: {passed}/{total} passed")
        
        if passed == total:
            print("🎉 All advanced backend tests passed!")
            return True
        else:
            print("⚠️  Some advanced backend tests failed")
            return False

if __name__ == "__main__":
    tester = AdvancedAPITester()
    success = tester.run_advanced_tests()
    exit(0 if success else 1)