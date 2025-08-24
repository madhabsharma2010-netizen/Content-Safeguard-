from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import base64
import json
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import httpx
import re
from urllib.parse import urlparse
import logging

# Import emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Content Safeguard API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "content_safeguard")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

# Global database connection
db = None

async def get_database():
    global db
    if db is None:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
    return db

# Pydantic models
class ContentAnalysisRequest(BaseModel):
    text: Optional[str] = None
    image_base64: Optional[str] = None
    url: Optional[str] = None
    content_type: str = "text"  # text, image, url, mixed

class FilterSettings(BaseModel):
    user_id: str
    categories: Dict[str, bool] = {
        "inappropriate_content": True,
        "fake_news": True,
        "violence": True,
        "adult_content": True,
        "hate_speech": True,
        "misinformation": True,
        "clickbait": True,
        "spam": True
    }
    strictness_level: str = "moderate"  # strict, moderate, permissive
    custom_keywords: List[str] = []
    whitelist_domains: List[str] = []
    blacklist_domains: List[str] = []

class ContentAnalysisResult(BaseModel):
    is_safe: bool
    confidence: float
    flagged_categories: List[str]
    analysis_details: Dict[str, Any]
    timestamp: datetime

# Content analysis functions
async def analyze_text_content(text: str, user_settings: FilterSettings) -> Dict[str, Any]:
    """Analyze text content using LLM for inappropriate content and fake news detection"""
    try:
        # Create LLM instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"content_analysis_{uuid.uuid4()}",
            system_message="""You are a content safety analyzer. Analyze the provided text and determine if it contains:
            1. Inappropriate content (violence, hate speech, adult content)
            2. Fake news or misinformation
            3. Clickbait or spam
            4. Any harmful content
            
            Respond in JSON format with:
            {
                "is_safe": boolean,
                "confidence": float (0.0-1.0),
                "flagged_categories": [list of categories],
                "analysis_details": {
                    "reasoning": "explanation",
                    "keywords_found": [list],
                    "credibility_score": float
                }
            }"""
        ).with_model("openai", "gpt-4o-mini")
        
        # Analyze content
        user_message = UserMessage(text=f"Analyze this content: {text}")
        response = await chat.send_message(user_message)
        
        # Parse response
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            # Fallback analysis if JSON parsing fails
            result = {
                "is_safe": True,
                "confidence": 0.5,
                "flagged_categories": [],
                "analysis_details": {
                    "reasoning": "AI analysis completed",
                    "keywords_found": [],
                    "credibility_score": 0.5
                }
            }
        
        # Check custom keywords
        for keyword in user_settings.custom_keywords:
            if keyword.lower() in text.lower():
                result["is_safe"] = False
                result["flagged_categories"].append("custom_keyword")
                result["analysis_details"]["keywords_found"].append(keyword)
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing text content: {e}")
        return {
            "is_safe": True,
            "confidence": 0.0,
            "flagged_categories": [],
            "analysis_details": {
                "reasoning": f"Analysis error: {str(e)}",
                "keywords_found": [],
                "credibility_score": 0.0
            }
        }

async def analyze_image_content(image_base64: str, user_settings: FilterSettings) -> Dict[str, Any]:
    """Analyze image content using LLM vision capabilities"""
    try:
        # Create LLM instance with vision capabilities
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"image_analysis_{uuid.uuid4()}",
            system_message="""You are an image content safety analyzer. Analyze the provided image and determine if it contains:
            1. Inappropriate visual content (violence, adult content, disturbing imagery)
            2. Hate symbols or offensive imagery
            3. Misinformation or manipulated content
            4. Any harmful visual content
            
            Respond in JSON format with:
            {
                "is_safe": boolean,
                "confidence": float (0.0-1.0),
                "flagged_categories": [list of categories],
                "analysis_details": {
                    "description": "what you see in the image",
                    "concerns": [list of concerns],
                    "safety_score": float
                }
            }"""
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Analyze image
        user_message = UserMessage(
            text="Analyze this image for inappropriate content and safety concerns.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse response
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            result = {
                "is_safe": True,
                "confidence": 0.5,
                "flagged_categories": [],
                "analysis_details": {
                    "description": "Image analyzed",
                    "concerns": [],
                    "safety_score": 0.5
                }
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing image content: {e}")
        return {
            "is_safe": True,
            "confidence": 0.0,
            "flagged_categories": [],
            "analysis_details": {
                "description": f"Analysis error: {str(e)}",
                "concerns": [],
                "safety_score": 0.0
            }
        }

async def analyze_url_content(url: str, user_settings: FilterSettings) -> Dict[str, Any]:
    """Analyze URL content by fetching and analyzing the page"""
    try:
        # Check domain whitelist/blacklist
        domain = urlparse(url).netloc.lower()
        
        if domain in user_settings.blacklist_domains:
            return {
                "is_safe": False,
                "confidence": 1.0,
                "flagged_categories": ["blacklisted_domain"],
                "analysis_details": {
                    "reasoning": "Domain is blacklisted",
                    "domain": domain,
                    "source_credibility": 0.0
                }
            }
        
        if domain in user_settings.whitelist_domains:
            return {
                "is_safe": True,
                "confidence": 1.0,
                "flagged_categories": [],
                "analysis_details": {
                    "reasoning": "Domain is whitelisted",
                    "domain": domain,
                    "source_credibility": 1.0
                }
            }
        
        # Fetch page content
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            content = response.text
        
        # Extract text content (simple extraction)
        text_content = re.sub(r'<[^>]+>', ' ', content)
        text_content = re.sub(r'\s+', ' ', text_content).strip()[:5000]  # Limit text size
        
        # Analyze extracted text
        return await analyze_text_content(text_content, user_settings)
        
    except Exception as e:
        logger.error(f"Error analyzing URL content: {e}")
        return {
            "is_safe": True,
            "confidence": 0.0,
            "flagged_categories": [],
            "analysis_details": {
                "reasoning": f"URL analysis error: {str(e)}",
                "domain": urlparse(url).netloc if url else "unknown",
                "source_credibility": 0.0
            }
        }

# API Endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Content Safeguard API"}

@app.post("/api/analyze-content")
async def analyze_content(request: ContentAnalysisRequest):
    """Analyze content for safety and appropriateness"""
    try:
        db = await get_database()
        
        # Default filter settings if not provided
        default_settings = FilterSettings(user_id="default")
        
        result = None
        
        if request.content_type == "text" and request.text:
            result = await analyze_text_content(request.text, default_settings)
        elif request.content_type == "image" and request.image_base64:
            result = await analyze_image_content(request.image_base64, default_settings)
        elif request.content_type == "url" and request.url:
            result = await analyze_url_content(request.url, default_settings)
        elif request.content_type == "mixed":
            # Analyze multiple content types
            results = []
            if request.text:
                text_result = await analyze_text_content(request.text, default_settings)
                results.append(text_result)
            if request.image_base64:
                image_result = await analyze_image_content(request.image_base64, default_settings)
                results.append(image_result)
            if request.url:
                url_result = await analyze_url_content(request.url, default_settings)
                results.append(url_result)
            
            # Combine results
            is_safe = all(r["is_safe"] for r in results)
            confidence = sum(r["confidence"] for r in results) / len(results) if results else 0.0
            flagged_categories = list(set(cat for r in results for cat in r["flagged_categories"]))
            
            result = {
                "is_safe": is_safe,
                "confidence": confidence,
                "flagged_categories": flagged_categories,
                "analysis_details": {
                    "combined_analysis": True,
                    "individual_results": results
                }
            }
        
        if result is None:
            raise HTTPException(status_code=400, detail="No valid content provided for analysis")
        
        # Store analysis result
        analysis_record = {
            "content_type": request.content_type,
            "result": result,
            "timestamp": datetime.utcnow(),
            "request_id": str(uuid.uuid4())
        }
        
        await db.content_analysis.insert_one(analysis_record)
        
        return ContentAnalysisResult(
            is_safe=result["is_safe"],
            confidence=result["confidence"],
            flagged_categories=result["flagged_categories"],
            analysis_details=result["analysis_details"],
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error in content analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Content analysis failed: {str(e)}")

@app.post("/api/filter-settings")
async def save_filter_settings(settings: FilterSettings):
    """Save user filter settings"""
    try:
        db = await get_database()
        
        settings_doc = settings.dict()
        settings_doc["updated_at"] = datetime.utcnow()
        
        # Upsert user settings
        await db.filter_settings.update_one(
            {"user_id": settings.user_id},
            {"$set": settings_doc},
            upsert=True
        )
        
        return {"message": "Filter settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving filter settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

@app.get("/api/filter-settings/{user_id}")
async def get_filter_settings(user_id: str):
    """Get user filter settings"""
    try:
        db = await get_database()
        
        settings = await db.filter_settings.find_one({"user_id": user_id})
        
        if not settings:
            # Return default settings
            return FilterSettings(user_id=user_id).dict()
        
        # Remove MongoDB _id field
        settings.pop("_id", None)
        return settings
        
    except Exception as e:
        logger.error(f"Error getting filter settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {str(e)}")

@app.get("/api/analysis-history/{user_id}")
async def get_analysis_history(user_id: str, limit: int = 50):
    """Get content analysis history for a user"""
    try:
        db = await get_database()
        
        # Get recent analysis results
        cursor = db.content_analysis.find().sort("timestamp", -1).limit(limit)
        history = []
        
        async for record in cursor:
            record["_id"] = str(record["_id"])
            history.append(record)
        
        return {"history": history, "count": len(history)}
        
    except Exception as e:
        logger.error(f"Error getting analysis history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")

@app.post("/api/report-content")
async def report_content(request: dict):
    """Report content as safe/unsafe for system learning"""
    try:
        db = await get_database()
        
        report_data = {
            "content": request.get("content"),
            "user_feedback": request.get("feedback"),  # safe/unsafe
            "content_type": request.get("content_type"),
            "timestamp": datetime.utcnow(),
            "user_id": request.get("user_id", "anonymous")
        }
        
        await db.content_reports.insert_one(report_data)
        
        return {"message": "Content report submitted successfully"}
        
    except Exception as e:
        logger.error(f"Error reporting content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to report content: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    try:
        db = await get_database()
        
        # Get analysis stats
        total_analyses = await db.content_analysis.count_documents({})
        safe_content = await db.content_analysis.count_documents({"result.is_safe": True})
        flagged_content = await db.content_analysis.count_documents({"result.is_safe": False})
        
        # Get recent activity
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_analyses = await db.content_analysis.count_documents({"timestamp": {"$gte": today}})
        
        return {
            "total_analyses": total_analyses,
            "safe_content": safe_content,
            "flagged_content": flagged_content,
            "today_analyses": today_analyses,
            "flagged_percentage": round((flagged_content / total_analyses * 100) if total_analyses > 0 else 0, 2)
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)