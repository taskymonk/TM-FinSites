#!/usr/bin/env python3
"""
FinSites Backend API Testing Suite
Tests all backend endpoints for the FinSites marketing platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class FinSitesAPITester:
    def __init__(self, base_url="https://finexpert-onboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data and isinstance(response_data, dict):
            result["response_keys"] = list(response_data.keys())
        
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:200]}

            details = f"Status: {response.status_code}"
            if not success:
                details += f" (expected {expected_status})"
                if response_data.get('detail'):
                    details += f" - {response_data['detail']}"

            self.log_test(name, success, details, response_data)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin authentication"""
        print("\n🔐 Testing Admin Authentication...")
        
        # Test login with correct credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@finsites.in", "password": "admin123"}
        )
        
        if success and response.get('role') == 'admin':
            self.log_test("Admin Role Verification", True, "Admin role confirmed")
            return True
        else:
            self.log_test("Admin Role Verification", False, "Admin role not found in response")
            return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET", 
            "auth/me",
            200
        )
        return success

    def test_plans_endpoint(self):
        """Test plans endpoint"""
        print("\n📋 Testing Plans Endpoint...")
        
        success, response = self.run_test(
            "Get Plans",
            "GET",
            "plans", 
            200
        )
        
        if success and isinstance(response, list) and len(response) >= 3:
            # Check for required plan structure
            plan_ids = [p.get('plan_id') for p in response]
            expected_plans = ['starter', 'professional', 'enterprise']
            
            if all(plan in plan_ids for plan in expected_plans):
                self.log_test("Plans Structure", True, f"Found all 3 plans: {plan_ids}")
            else:
                self.log_test("Plans Structure", False, f"Missing plans. Found: {plan_ids}")
        
        return success

    def test_audit_scan(self):
        """Test audit scan functionality"""
        print("\n🔍 Testing Audit Scan...")
        
        # Test with a valid URL
        success, response = self.run_test(
            "Audit Scan",
            "POST",
            "audit/scan",
            200,
            data={"url": "https://example.com"}
        )
        
        if success:
            audit_id = response.get('audit_id')
            if audit_id:
                self.log_test("Audit ID Generation", True, f"Generated audit_id: {audit_id}")
                
                # Test retrieving the audit
                success2, _ = self.run_test(
                    "Get Audit Result",
                    "GET",
                    f"audit/{audit_id}",
                    200
                )
                return success2
            else:
                self.log_test("Audit ID Generation", False, "No audit_id in response")
        
        return success

    def test_wizard_flow(self):
        """Test wizard flow endpoints"""
        print("\n🧙 Testing Wizard Flow...")
        
        # Start wizard
        success, response = self.run_test(
            "Start Wizard",
            "POST",
            "wizard/start",
            200,
            data={
                "plan_id": "starter",
                "contact_name": "Test User",
                "contact_email": "test@example.com", 
                "contact_phone": "+91 9876543210"
            }
        )
        
        if not success:
            return False
            
        session_id = response.get('session_id')
        if not session_id:
            self.log_test("Session ID Generation", False, "No session_id in response")
            return False
            
        self.log_test("Session ID Generation", True, f"Generated session_id: {session_id}")
        
        # Get wizard session
        success2, _ = self.run_test(
            "Get Wizard Session",
            "GET",
            f"wizard/{session_id}",
            200
        )
        
        if not success2:
            return False
            
        # Save step data
        success3, _ = self.run_test(
            "Save Wizard Step",
            "PUT",
            f"wizard/{session_id}/step/1",
            200,
            data={"data": {"business_types": ["MFD"]}}
        )
        
        return success3

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n👑 Testing Admin Endpoints...")
        
        # Test admin stats
        success1, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        
        if success1:
            required_keys = ['total_submissions', 'by_status', 'total_audits']
            missing_keys = [k for k in required_keys if k not in response]
            if missing_keys:
                self.log_test("Admin Stats Structure", False, f"Missing keys: {missing_keys}")
            else:
                self.log_test("Admin Stats Structure", True, "All required keys present")
        
        # Test admin submissions list
        success2, _ = self.run_test(
            "Admin Submissions List",
            "GET", 
            "admin/submissions",
            200
        )
        
        return success1 and success2

    def test_enterprise_contact(self):
        """Test enterprise contact endpoint"""
        print("\n🏢 Testing Enterprise Contact...")
        
        success, response = self.run_test(
            "Enterprise Contact",
            "POST",
            "contact/enterprise",
            200,
            data={
                "name": "Test Enterprise",
                "email": "enterprise@test.com",
                "phone": "+91 9876543210",
                "company": "Test Company",
                "message": "Test inquiry"
            }
        )
        
        if success and response.get('contact_id'):
            self.log_test("Enterprise Contact ID", True, f"Generated contact_id: {response['contact_id']}")
        
        return success

    def test_invalid_endpoints(self):
        """Test error handling"""
        print("\n❌ Testing Error Handling...")
        
        # Test invalid login
        success, _ = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "wrong@email.com", "password": "wrongpass"}
        )
        
        # Test non-existent audit
        success2, _ = self.run_test(
            "Non-existent Audit",
            "GET",
            "audit/invalid-id",
            404
        )
        
        # Test non-existent wizard session
        success3, _ = self.run_test(
            "Non-existent Wizard",
            "GET", 
            "wizard/invalid-session",
            404
        )
        
        return success and success2 and success3

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting FinSites Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test authentication first
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        # Test authenticated endpoints
        self.test_auth_me()
        
        # Test public endpoints
        self.test_plans_endpoint()
        self.test_audit_scan()
        self.test_wizard_flow()
        self.test_enterprise_contact()
        
        # Test admin endpoints
        self.test_admin_endpoints()
        
        # Test error handling
        self.test_invalid_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = FinSitesAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())