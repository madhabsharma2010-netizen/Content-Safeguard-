#!/usr/bin/env python3
"""
Backend API Testing for Content Safeguarding System
Tests all backend endpoints with realistic data scenarios
"""

import asyncio
import aiohttp
import json
import base64
import os
from datetime import datetime
from typing import Dict, Any

# Backend URL from environment
BACKEND_URL = "https://mobile-safeguard.preview.emergentagent.com/api"

class ContentSafeguardTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        self.test_user_id = "test_user_12345"
        
    async def setup(self):
        """Setup test session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
    async def cleanup(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
            
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {details}")
        
    async def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            async with self.session.get(f"{BACKEND_URL}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "healthy":
                        self.log_test("Health Check", True, "API is healthy")
                        return True
                    else:
                        self.log_test("Health Check", False, f"Unexpected response: {data}")
                        return False
                else:
                    self.log_test("Health Check", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
            
    async def test_text_content_analysis(self):
        """Test text content analysis with various scenarios"""
        test_cases = [
            {
                "name": "Safe News Article",
                "text": "Scientists have discovered a new species of butterfly in the Amazon rainforest. The colorful insect was found during a biodiversity survey and represents an important addition to our understanding of tropical ecosystems.",
                "expected_safe": True
            },
            {
                "name": "Potentially Inappropriate Content",
                "text": "This is a test of potentially harmful content that might contain violence or inappropriate material for testing purposes only.",
                "expected_safe": False
            },
            {
                "name": "Educational Content",
                "text": "Climate change is affecting global weather patterns. Scientists recommend reducing carbon emissions through renewable energy adoption and sustainable practices.",
                "expected_safe": True
            }
        ]
        
        all_passed = True
        for case in test_cases:
            try:
                payload = {
                    "text": case["text"],
                    "content_type": "text"
                }
                
                async with self.session.post(
                    f"{BACKEND_URL}/analyze-content",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check required fields
                        required_fields = ["is_safe", "confidence", "flagged_categories", "analysis_details"]
                        if all(field in data for field in required_fields):
                            self.log_test(f"Text Analysis - {case['name']}", True, 
                                        f"Safe: {data['is_safe']}, Confidence: {data['confidence']}")
                        else:
                            self.log_test(f"Text Analysis - {case['name']}", False, 
                                        f"Missing required fields in response")
                            all_passed = False
                    else:
                        self.log_test(f"Text Analysis - {case['name']}", False, 
                                    f"HTTP {response.status}")
                        all_passed = False
                        
            except Exception as e:
                self.log_test(f"Text Analysis - {case['name']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
        
    async def test_url_content_analysis(self):
        """Test URL content analysis"""
        test_urls = [
            {
                "name": "News Website",
                "url": "https://www.bbc.com/news",
                "expected_safe": True
            },
            {
                "name": "Educational Site",
                "url": "https://www.wikipedia.org",
                "expected_safe": True
            }
        ]
        
        all_passed = True
        for case in test_urls:
            try:
                payload = {
                    "url": case["url"],
                    "content_type": "url"
                }
                
                async with self.session.post(
                    f"{BACKEND_URL}/analyze-content",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check required fields
                        required_fields = ["is_safe", "confidence", "flagged_categories", "analysis_details"]
                        if all(field in data for field in required_fields):
                            self.log_test(f"URL Analysis - {case['name']}", True, 
                                        f"Safe: {data['is_safe']}, Confidence: {data['confidence']}")
                        else:
                            self.log_test(f"URL Analysis - {case['name']}", False, 
                                        f"Missing required fields in response")
                            all_passed = False
                    else:
                        self.log_test(f"URL Analysis - {case['name']}", False, 
                                    f"HTTP {response.status}")
                        all_passed = False
                        
            except Exception as e:
                self.log_test(f"URL Analysis - {case['name']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
        
    async def test_image_content_analysis(self):
        """Test image content analysis with base64 encoded image"""
        try:
            # Create a simple test image (1x1 pixel PNG in base64)
            test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            
            payload = {
                "image_base64": test_image_b64,
                "content_type": "image"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/analyze-content",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check required fields
                    required_fields = ["is_safe", "confidence", "flagged_categories", "analysis_details"]
                    if all(field in data for field in required_fields):
                        self.log_test("Image Analysis", True, 
                                    f"Safe: {data['is_safe']}, Confidence: {data['confidence']}")
                        return True
                    else:
                        self.log_test("Image Analysis", False, 
                                    f"Missing required fields in response")
                        return False
                else:
                    self.log_test("Image Analysis", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Image Analysis", False, f"Exception: {str(e)}")
            return False
            
    async def test_mixed_content_analysis(self):
        """Test mixed content analysis"""
        try:
            test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            
            payload = {
                "text": "This is a test article about technology trends.",
                "image_base64": test_image_b64,
                "url": "https://www.example.com",
                "content_type": "mixed"
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/analyze-content",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check required fields
                    required_fields = ["is_safe", "confidence", "flagged_categories", "analysis_details"]
                    if all(field in data for field in required_fields):
                        # Check if combined analysis is indicated
                        if "combined_analysis" in data.get("analysis_details", {}):
                            self.log_test("Mixed Content Analysis", True, 
                                        f"Combined analysis completed - Safe: {data['is_safe']}")
                            return True
                        else:
                            self.log_test("Mixed Content Analysis", True, 
                                        f"Mixed analysis completed - Safe: {data['is_safe']}")
                            return True
                    else:
                        self.log_test("Mixed Content Analysis", False, 
                                    f"Missing required fields in response")
                        return False
                else:
                    self.log_test("Mixed Content Analysis", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Mixed Content Analysis", False, f"Exception: {str(e)}")
            return False
            
    async def test_filter_settings_save(self):
        """Test saving filter settings"""
        try:
            settings = {
                "user_id": self.test_user_id,
                "categories": {
                    "inappropriate_content": True,
                    "fake_news": True,
                    "violence": False,
                    "adult_content": True,
                    "hate_speech": True,
                    "misinformation": True,
                    "clickbait": False,
                    "spam": True
                },
                "strictness_level": "strict",
                "custom_keywords": ["test_keyword", "blocked_word"],
                "whitelist_domains": ["trusted-news.com", "education.org"],
                "blacklist_domains": ["spam-site.com", "fake-news.net"]
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/filter-settings",
                json=settings,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if "message" in data and "success" in data["message"].lower():
                        self.log_test("Filter Settings Save", True, "Settings saved successfully")
                        return True
                    else:
                        self.log_test("Filter Settings Save", False, f"Unexpected response: {data}")
                        return False
                else:
                    self.log_test("Filter Settings Save", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Filter Settings Save", False, f"Exception: {str(e)}")
            return False
            
    async def test_filter_settings_get(self):
        """Test getting filter settings"""
        try:
            async with self.session.get(f"{BACKEND_URL}/filter-settings/{self.test_user_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check required fields
                    required_fields = ["user_id", "categories", "strictness_level"]
                    if all(field in data for field in required_fields):
                        if data["user_id"] == self.test_user_id:
                            self.log_test("Filter Settings Get", True, 
                                        f"Retrieved settings for user {self.test_user_id}")
                            return True
                        else:
                            self.log_test("Filter Settings Get", False, 
                                        f"User ID mismatch: expected {self.test_user_id}, got {data.get('user_id')}")
                            return False
                    else:
                        self.log_test("Filter Settings Get", False, 
                                    f"Missing required fields in response")
                        return False
                else:
                    self.log_test("Filter Settings Get", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Filter Settings Get", False, f"Exception: {str(e)}")
            return False
            
    async def test_analysis_history(self):
        """Test getting analysis history"""
        try:
            async with self.session.get(f"{BACKEND_URL}/analysis-history/{self.test_user_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check required fields
                    if "history" in data and "count" in data:
                        if isinstance(data["history"], list):
                            self.log_test("Analysis History", True, 
                                        f"Retrieved {data['count']} history records")
                            return True
                        else:
                            self.log_test("Analysis History", False, 
                                        f"History is not a list: {type(data['history'])}")
                            return False
                    else:
                        self.log_test("Analysis History", False, 
                                    f"Missing required fields in response")
                        return False
                else:
                    self.log_test("Analysis History", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Analysis History", False, f"Exception: {str(e)}")
            return False
            
    async def test_content_reporting(self):
        """Test content reporting"""
        try:
            report_data = {
                "content": "This is test content for reporting",
                "feedback": "unsafe",
                "content_type": "text",
                "user_id": self.test_user_id
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/report-content",
                json=report_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if "message" in data and "success" in data["message"].lower():
                        self.log_test("Content Reporting", True, "Content reported successfully")
                        return True
                    else:
                        self.log_test("Content Reporting", False, f"Unexpected response: {data}")
                        return False
                else:
                    self.log_test("Content Reporting", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Content Reporting", False, f"Exception: {str(e)}")
            return False
            
    async def test_statistics(self):
        """Test statistics endpoint"""
        try:
            async with self.session.get(f"{BACKEND_URL}/stats") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check required fields
                    required_fields = ["total_analyses", "safe_content", "flagged_content", "today_analyses"]
                    if all(field in data for field in required_fields):
                        self.log_test("Statistics", True, 
                                    f"Total analyses: {data['total_analyses']}, "
                                    f"Safe: {data['safe_content']}, "
                                    f"Flagged: {data['flagged_content']}")
                        return True
                    else:
                        self.log_test("Statistics", False, 
                                    f"Missing required fields in response")
                        return False
                else:
                    self.log_test("Statistics", False, f"HTTP {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Statistics", False, f"Exception: {str(e)}")
            return False
            
    async def test_error_handling(self):
        """Test error handling with invalid requests"""
        try:
            # Test with empty content
            payload = {"content_type": "text"}
            
            async with self.session.post(
                f"{BACKEND_URL}/analyze-content",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 400:
                    self.log_test("Error Handling - Empty Content", True, 
                                "Correctly returned 400 for empty content")
                    return True
                else:
                    self.log_test("Error Handling - Empty Content", False, 
                                f"Expected 400, got {response.status}")
                    return False
                    
        except Exception as e:
            self.log_test("Error Handling - Empty Content", False, f"Exception: {str(e)}")
            return False
            
    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Content Safeguard Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        await self.setup()
        
        try:
            # Core functionality tests
            await self.test_health_endpoint()
            await self.test_text_content_analysis()
            await self.test_url_content_analysis()
            await self.test_image_content_analysis()
            await self.test_mixed_content_analysis()
            
            # Settings and data management tests
            await self.test_filter_settings_save()
            await self.test_filter_settings_get()
            await self.test_analysis_history()
            await self.test_content_reporting()
            await self.test_statistics()
            
            # Error handling tests
            await self.test_error_handling()
            
        finally:
            await self.cleanup()
            
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return passed == total

async def main():
    """Main test runner"""
    tester = ContentSafeguardTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n💥 Some tests failed!")
        return 1

if __name__ == "__main__":
    import sys
    result = asyncio.run(main())
    sys.exit(result)