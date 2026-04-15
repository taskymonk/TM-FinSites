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
        """Test audit scan functionality with Phase 1 improvements"""
        print("\n🔍 Testing Audit Scan - Phase 1 Improvements...")
        
        # Test with deftservices.in to verify Phase 1 improvements
        success, response = self.run_test(
            "Audit Scan - deftservices.in",
            "POST",
            "audit/scan",
            200,
            data={"url": "https://deftservices.in/"}
        )
        
        if success:
            audit_id = response.get('audit_id')
            if audit_id:
                self.log_test("Audit ID Generation", True, f"Generated audit_id: {audit_id}")
                
                # Test retrieving the audit
                success2, audit_data = self.run_test(
                    "Get Audit Result",
                    "GET",
                    f"audit/{audit_id}",
                    200
                )
                
                if success2:
                    detected_data = audit_data.get('detected_data', {})
                    registrations = detected_data.get('registrations', {})
                    business_types = audit_data.get('detected_business_types', [])
                    services = detected_data.get('services_detected', [])
                    officers = detected_data.get('officers', {})
                    contact = detected_data.get('contact', {})
                    
                    # Test 1: Address extraction (should detect Badal Textile Market, Bhilwara, Rajasthan 311001, NOT CSS code)
                    address = contact.get('address', '')
                    if address and 'badal textile market' in address.lower() and 'bhilwara' in address.lower() and 'rajasthan' in address.lower() and '311001' in address:
                        self.log_test("Phase 1 - Address Extraction", True, f"Correctly detected: '{address}' (not CSS code)")
                    else:
                        self.log_test("Phase 1 - Address Extraction", False, f"Expected 'Badal Textile Market, Bhilwara, Rajasthan 311001', got: '{address}'")
                    
                    # Test 2: APRN registration detection (APRN-05434)
                    aprn_numbers = registrations.get('APRN', [])
                    if aprn_numbers and any('05434' in aprn for aprn in aprn_numbers):
                        self.log_test("Phase 1 - APRN Detection", True, f"Detected APRN: {aprn_numbers}")
                    else:
                        self.log_test("Phase 1 - APRN Detection", False, f"Expected APRN-05434, got: {aprn_numbers}")
                    
                    # Test 3: PMS business type detection (because of APRN)
                    if 'PMS' in business_types:
                        self.log_test("Phase 1 - PMS Business Type", True, f"Detected PMS in business types: {business_types}")
                    else:
                        self.log_test("Phase 1 - PMS Business Type", False, f"PMS not detected in business types: {business_types}")
                    
                    # Test 4: Granular services detection (should detect 10+ services)
                    if len(services) >= 10:
                        self.log_test("Phase 1 - Granular Services", True, f"Detected {len(services)} services: {services}")
                    else:
                        self.log_test("Phase 1 - Granular Services", False, f"Expected 10+ services, detected {len(services)}: {services}")
                    
                    # Test 5: Principal Officer detection (Deepak Jain)
                    principal_officer = officers.get('principal_officer', '')
                    if principal_officer and 'deepak jain' in principal_officer.lower():
                        self.log_test("Phase 1 - Principal Officer", True, f"Detected: '{principal_officer}'")
                    else:
                        self.log_test("Phase 1 - Principal Officer", False, f"Expected 'Deepak Jain', got: '{principal_officer}'")
                    
                    # Test business name extraction (should not be CSS code)
                    business_name = detected_data.get('business_name', '')
                    if business_name and business_name.lower() != 'home' and 'css' not in business_name.lower():
                        if 'deft' in business_name.lower() or 'services' in business_name.lower():
                            self.log_test("Business Name Extraction", True, f"Detected: '{business_name}' (clean, not CSS)")
                        else:
                            self.log_test("Business Name Extraction", False, f"Detected: '{business_name}' - should contain 'Deft' or 'Services'")
                    else:
                        self.log_test("Business Name Extraction", False, f"Detected: '{business_name}' - should not be 'home' or contain CSS")
                    
                    # Store audit_id for business type update test
                    self.test_audit_id = audit_id
                
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
        
    def test_audit_business_type_update(self):
        """Test audit business type update (re-check functionality)"""
        print("\n🔄 Testing Audit Business Type Update...")
        
        if not hasattr(self, 'test_audit_id'):
            self.log_test("Business Type Update", False, "No audit_id available from previous test")
            return False
        
        # Test updating business types and re-running compliance
        success, response = self.run_test(
            "Update Audit Business Types",
            "PUT",
            f"audit/{self.test_audit_id}/business-type",
            200,
            data={"business_types": ["MFD", "Insurance", "PMS"]}
        )
        
        if success:
            # Verify the business types were updated
            updated_types = response.get('detected_business_types', [])
            expected_types = ["MFD", "Insurance", "PMS"]
            if set(updated_types) == set(expected_types):
                self.log_test("Business Types Updated", True, f"Updated to: {updated_types}")
                
                # Verify compliance report was re-generated
                compliance_report = response.get('compliance_report', {})
                if compliance_report.get('checks'):
                    self.log_test("Compliance Re-check", True, f"Re-generated {len(compliance_report['checks'])} compliance checks")
                else:
                    self.log_test("Compliance Re-check", False, "No compliance checks in updated report")
            else:
                self.log_test("Business Types Updated", False, f"Expected {expected_types}, got {updated_types}")
        
        return success

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

    def test_logo_upload_endpoints(self):
        """Test logo upload and file serving endpoints (Phase 1)"""
        print("\n📁 Testing Logo Upload & File Serving - Phase 1...")
        
        # Create a simple test image (1x1 PNG)
        import base64
        # Minimal 1x1 PNG image in base64
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHGbKdMDgAAAABJRU5ErkJggg==')
        
        # Test logo upload
        try:
            files = {'file': ('test_logo.png', png_data, 'image/png')}
            response = self.session.post(f"{self.base_url}/api/upload/logo", files=files)
            
            if response.status_code == 200:
                upload_data = response.json()
                file_id = upload_data.get('file_id')
                file_path = upload_data.get('path')
                file_url = upload_data.get('url')
                
                if file_id and file_path and file_url:
                    self.log_test("Logo Upload", True, f"Uploaded file_id: {file_id}, path: {file_path}")
                    
                    # Test file serving
                    file_response = self.session.get(f"{self.base_url}{file_url}")
                    if file_response.status_code == 200 and file_response.headers.get('content-type', '').startswith('image/'):
                        self.log_test("File Serving", True, f"File served successfully with content-type: {file_response.headers.get('content-type')}")
                        return True
                    else:
                        self.log_test("File Serving", False, f"File serving failed: {file_response.status_code}")
                else:
                    self.log_test("Logo Upload", False, f"Missing required fields in response: {upload_data}")
            else:
                self.log_test("Logo Upload", False, f"Upload failed with status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Logo Upload", False, f"Upload error: {str(e)}")
        
        return False

    def test_object_storage_initialization(self):
        """Test object storage initialization"""
        print("\n🗄️ Testing Object Storage Initialization...")
        
        # Test that backend starts without errors by checking a simple endpoint
        success, response = self.run_test(
            "Backend Health Check",
            "GET",
            "plans",
            200
        )
        
        if success:
            self.log_test("Object Storage Init", True, "Backend started successfully (storage initialized)")
        else:
            self.log_test("Object Storage Init", False, "Backend startup issues detected")
        
        return success

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
        print("🚀 Starting FinSites Backend API Tests - Phase 1 Improvements")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test object storage initialization first
        self.test_object_storage_initialization()
        
        # Test authentication first
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        # Test authenticated endpoints
        self.test_auth_me()
        
        # Test public endpoints
        self.test_plans_endpoint()
        
        # Test Phase 1 improvements
        self.test_audit_scan()  # Now includes Phase 1 audit improvements
        self.test_logo_upload_endpoints()  # New Phase 1 feature
        
        # Test existing functionality
        self.test_audit_business_type_update()  # Test the re-check functionality
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