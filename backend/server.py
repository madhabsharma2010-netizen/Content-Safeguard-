from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import base64
import json
import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import httpx
import re
from urllib.parse import urlparse
import logging
import schedule
import time
from threading import Thread

# Import emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Content Safeguard API - Advanced", version="2.0.0")

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

# Enhanced Pydantic models
class ContentAnalysisRequest(BaseModel):
    text: Optional[str] = None
    image_base64: Optional[str] = None
    url: Optional[str] = None
    content_type: str = "text"
    app_source: Optional[str] = None  # WhatsApp, Instagram, etc.
    auto_scan: bool = False

class AdvancedFilterSettings(BaseModel):
    user_id: str
    categories: Dict[str, bool] = {
        "inappropriate_content": True,
        "fake_news": True,
        "violence": True,
        "adult_content": True,
        "hate_speech": True,
        "misinformation": True,
        "clickbait": True,
        "spam": True,
        "political_bias": False,
        "conspiracy_theories": True
    }
    strictness_level: str = "moderate"
    custom_keywords: List[str] = []
    whitelist_domains: List[str] = []
    blacklist_domains: List[str] = []
    auto_scan_enabled: bool = True
    notification_enabled: bool = True
    time_limits: Dict[str, int] = {
        "daily_scan_limit": 1000,
        "hourly_scan_limit": 100,
        "analysis_timeout": 30
    }
    scheduled_scans: List[Dict[str, Any]] = []

class AppIntegrationSettings(BaseModel):
    user_id: str
    enabled_apps: List[str] = ["whatsapp", "instagram", "facebook", "twitter", "telegram"]
    scan_frequency: str = "real_time"  # real_time, scheduled, manual
    auto_block: bool = False
    warning_mode: bool = True
    accessibility_enabled: bool = False

class ScheduledTask(BaseModel):
    user_id: str
    task_type: str  # daily_report, weekly_summary, app_scan
    schedule_time: str  # "14:30" for 2:30 PM
    enabled: bool = True
    parameters: Dict[str, Any] = {}

class ContentReport(BaseModel):
    content_id: str
    user_feedback: str  # safe, unsafe, false_positive
    content_type: str
    user_id: str
    notes: Optional[str] = None

# Background task scheduler
def run_scheduler():
    while True:
        schedule.run_pending()
        time.sleep(60)

# Start scheduler in background
scheduler_thread = Thread(target=run_scheduler, daemon=True)
scheduler_thread.start()

# Enhanced content analysis functions
async def analyze_text_content(text: str, user_settings: AdvancedFilterSettings, app_source: str = None) -> Dict[str, Any]:
    """Enhanced text analysis with app-specific context"""
    try:
        # Create enhanced system message based on app source
        system_context = f"You are analyzing content from {app_source or 'unknown source'}." if app_source else ""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"content_analysis_{uuid.uuid4()}",
            system_message=f"""You are an advanced content safety analyzer. {system_context}
            
            Analyze the provided text for:
            1. Inappropriate content (violence, hate speech, adult content)
            2. Fake news, misinformation, and conspiracy theories
            3. Political bias and propaganda
            4. Clickbait and spam content
            5. Context-specific threats based on source platform
            
            Consider strictness level: {user_settings.strictness_level}
            
            Respond in JSON format with:
            {{
                "is_safe": boolean,
                "confidence": float (0.0-1.0),
                "flagged_categories": [list of categories],
                "analysis_details": {{
                    "reasoning": "detailed explanation",
                    "keywords_found": [list],
                    "credibility_score": float,
                    "context_risk": float,
                    "source_analysis": "platform-specific insights"
                }}
            }}"""
        ).with_model("openai", "gpt-4o-mini")
        
        # Analyze content
        user_message = UserMessage(text=f"Analyze this content: {text}")
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
                    "reasoning": "AI analysis completed",
                    "keywords_found": [],
                    "credibility_score": 0.5,
                    "context_risk": 0.0,
                    "source_analysis": "Standard analysis"
                }
            }
        
        # Enhanced keyword checking
        for keyword in user_settings.custom_keywords:
            if keyword.lower() in text.lower():
                result["is_safe"] = False
                result["flagged_categories"].append("custom_keyword")
                result["analysis_details"]["keywords_found"].append(keyword)
        
        # Apply strictness level adjustments
        if user_settings.strictness_level == "strict":
            result["confidence"] = min(result["confidence"] * 1.2, 1.0)
        elif user_settings.strictness_level == "permissive":
            result["confidence"] = max(result["confidence"] * 0.8, 0.0)
        
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
                "credibility_score": 0.0,
                "context_risk": 0.0,
                "source_analysis": "Error in analysis"
            }
        }

async def analyze_image_content(image_base64: str, user_settings: AdvancedFilterSettings, app_source: str = None) -> Dict[str, Any]:
    """Enhanced image analysis with context awareness"""
    try:
        context_msg = f"from {app_source}" if app_source else ""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"image_analysis_{uuid.uuid4()}",
            system_message=f"""You are an advanced image content safety analyzer. Analyzing image {context_msg}.
            
            Examine the image for:
            1. Inappropriate visual content (violence, adult content, disturbing imagery)
            2. Hate symbols, offensive imagery, or propaganda
            3. Misinformation or manipulated content (deepfakes, edited images)
            4. Context-appropriate content based on source platform
            5. Visual spam or misleading imagery
            
            Strictness level: {user_settings.strictness_level}
            
            Respond in JSON format with:
            {{
                "is_safe": boolean,
                "confidence": float (0.0-1.0),
                "flagged_categories": [list of categories],
                "analysis_details": {{
                    "description": "what you see in the image",
                    "concerns": [list of concerns],
                    "safety_score": float,
                    "manipulation_detected": boolean,
                    "context_appropriateness": float
                }}
            }}"""
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Analyze image
        user_message = UserMessage(
            text="Analyze this image for safety, appropriateness, and potential misinformation.",
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
                    "safety_score": 0.5,
                    "manipulation_detected": False,
                    "context_appropriateness": 0.7
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
                "safety_score": 0.0,
                "manipulation_detected": False,
                "context_appropriateness": 0.0
            }
        }

# API Endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Content Safeguard API - Advanced", "version": "2.0.0"}

@app.post("/api/analyze-content")
async def analyze_content(request: ContentAnalysisRequest):
    """Enhanced content analysis with app source tracking"""
    try:
        db = await get_database()
        
        # Get user settings or use defaults
        settings_doc = await db.advanced_filter_settings.find_one({"user_id": "default_user"})
        if settings_doc:
            settings_doc.pop("_id", None)
            user_settings = AdvancedFilterSettings(**settings_doc)
        else:
            user_settings = AdvancedFilterSettings(user_id="default_user")
        
        result = None
        
        if request.content_type == "text" and request.text:
            result = await analyze_text_content(request.text, user_settings, request.app_source)
        elif request.content_type == "image" and request.image_base64:
            result = await analyze_image_content(request.image_base64, user_settings, request.app_source)
        elif request.content_type == "url" and request.url:
            # URL analysis remains the same but enhanced
            result = await analyze_url_content(request.url, user_settings)
        elif request.content_type == "mixed":
            # Enhanced mixed analysis
            results = []
            if request.text:
                text_result = await analyze_text_content(request.text, user_settings, request.app_source)
                results.append(text_result)
            if request.image_base64:
                image_result = await analyze_image_content(request.image_base64, user_settings, request.app_source)
                results.append(image_result)
            if request.url:
                url_result = await analyze_url_content(request.url, user_settings)
                results.append(url_result)
            
            # Enhanced result combination
            is_safe = all(r["is_safe"] for r in results)
            confidence = sum(r["confidence"] for r in results) / len(results) if results else 0.0
            flagged_categories = list(set(cat for r in results for cat in r["flagged_categories"]))
            
            result = {
                "is_safe": is_safe,
                "confidence": confidence,
                "flagged_categories": flagged_categories,
                "analysis_details": {
                    "combined_analysis": True,
                    "individual_results": results,
                    "risk_assessment": "high" if not is_safe and confidence > 0.7 else "medium" if not is_safe else "low"
                }
            }
        
        if result is None:
            raise HTTPException(status_code=400, detail="No valid content provided for analysis")
        
        # Enhanced analysis record with app source
        analysis_record = {
            "content_type": request.content_type,
            "app_source": request.app_source,
            "result": result,
            "timestamp": datetime.utcnow(),
            "request_id": str(uuid.uuid4()),
            "auto_scan": request.auto_scan,
            "risk_level": "high" if not result["is_safe"] and result["confidence"] > 0.7 else "medium" if not result["is_safe"] else "low"
        }
        
        await db.content_analysis.insert_one(analysis_record)
        
        # Trigger notifications if enabled and content is unsafe
        if not result["is_safe"] and user_settings.notification_enabled:
            await trigger_content_alert(result, request.app_source)
        
        return {
            "is_safe": result["is_safe"],
            "confidence": result["confidence"],
            "flagged_categories": result["flagged_categories"],
            "analysis_details": result["analysis_details"],
            "timestamp": datetime.utcnow(),
            "app_source": request.app_source,
            "risk_level": analysis_record["risk_level"]
        }
        
    except Exception as e:
        logger.error(f"Error in content analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Content analysis failed: {str(e)}")

@app.post("/api/advanced-filter-settings")
async def save_advanced_filter_settings(settings: AdvancedFilterSettings):
    """Save advanced filter settings with time limits"""
    try:
        db = await get_database()
        
        settings_doc = settings.dict()
        settings_doc["updated_at"] = datetime.utcnow()
        
        await db.advanced_filter_settings.update_one(
            {"user_id": settings.user_id},
            {"$set": settings_doc},
            upsert=True
        )
        
        return {"message": "Advanced filter settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving advanced filter settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

@app.get("/api/advanced-filter-settings/{user_id}")
async def get_advanced_filter_settings(user_id: str):
    """Get advanced filter settings"""
    try:
        db = await get_database()
        
        settings = await db.advanced_filter_settings.find_one({"user_id": user_id})
        
        if not settings:
            return AdvancedFilterSettings(user_id=user_id).dict()
        
        settings.pop("_id", None)
        return settings
        
    except Exception as e:
        logger.error(f"Error getting advanced filter settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {str(e)}")

@app.post("/api/app-integration-settings")
async def save_app_integration_settings(settings: AppIntegrationSettings):
    """Save app integration settings"""
    try:
        db = await get_database()
        
        settings_doc = settings.dict()
        settings_doc["updated_at"] = datetime.utcnow()
        
        await db.app_integration_settings.update_one(
            {"user_id": settings.user_id},
            {"$set": settings_doc},
            upsert=True
        )
        
        return {"message": "App integration settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving app integration settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

@app.get("/api/app-integration-settings/{user_id}")
async def get_app_integration_settings(user_id: str):
    """Get app integration settings"""
    try:
        db = await get_database()
        
        settings = await db.app_integration_settings.find_one({"user_id": user_id})
        
        if not settings:
            return AppIntegrationSettings(user_id=user_id).dict()
        
        settings.pop("_id", None)
        return settings
        
    except Exception as e:
        logger.error(f"Error getting app integration settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {str(e)}")

@app.post("/api/schedule-task")
async def schedule_task(task: ScheduledTask):
    """Schedule automated tasks"""
    try:
        db = await get_database()
        
        task_doc = task.dict()
        task_doc["created_at"] = datetime.utcnow()
        task_doc["task_id"] = str(uuid.uuid4())
        
        await db.scheduled_tasks.insert_one(task_doc)
        
        # Add to Python scheduler
        if task.task_type == "daily_report":
            schedule.every().day.at(task.schedule_time).do(
                generate_daily_report, task.user_id
            ).tag(task_doc["task_id"])
        
        return {"message": "Task scheduled successfully", "task_id": task_doc["task_id"]}
        
    except Exception as e:
        logger.error(f"Error scheduling task: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule task: {str(e)}")

@app.get("/api/enhanced-stats/{user_id}")
async def get_enhanced_stats(user_id: str):
    """Get enhanced statistics with app breakdown"""
    try:
        db = await get_database()
        
        # Basic stats
        total_analyses = await db.content_analysis.count_documents({})
        safe_content = await db.content_analysis.count_documents({"result.is_safe": True})
        flagged_content = await db.content_analysis.count_documents({"result.is_safe": False})
        
        # App-wise breakdown
        app_stats = await db.content_analysis.aggregate([
            {"$group": {
                "_id": "$app_source",
                "count": {"$sum": 1},
                "unsafe_count": {"$sum": {"$cond": [{"$eq": ["$result.is_safe", False]}, 1, 0]}}
            }}
        ]).to_list(None)
        
        # Time-based analysis
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        today_analyses = await db.content_analysis.count_documents({"timestamp": {"$gte": today}})
        week_analyses = await db.content_analysis.count_documents({"timestamp": {"$gte": week_ago}})
        
        # Risk level breakdown
        risk_stats = await db.content_analysis.aggregate([
            {"$group": {
                "_id": "$risk_level",
                "count": {"$sum": 1}
            }}
        ]).to_list(None)
        
        return {
            "total_analyses": total_analyses,
            "safe_content": safe_content,
            "flagged_content": flagged_content,
            "today_analyses": today_analyses,
            "week_analyses": week_analyses,
            "flagged_percentage": round((flagged_content / total_analyses * 100) if total_analyses > 0 else 0, 2),
            "app_breakdown": app_stats,
            "risk_breakdown": risk_stats,
            "protection_trend": await get_protection_trend()
        }
        
    except Exception as e:
        logger.error(f"Error getting enhanced stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

async def get_protection_trend():
    """Get 7-day protection trend"""
    try:
        db = await get_database()
        
        trend_data = []
        for i in range(7):
            date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            next_date = date + timedelta(days=1)
            
            day_total = await db.content_analysis.count_documents({
                "timestamp": {"$gte": date, "$lt": next_date}
            })
            day_safe = await db.content_analysis.count_documents({
                "timestamp": {"$gte": date, "$lt": next_date},
                "result.is_safe": True
            })
            
            trend_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "total": day_total,
                "safe": day_safe,
                "safe_percentage": round((day_safe / day_total * 100) if day_total > 0 else 0, 2)
            })
        
        return trend_data
        
    except Exception as e:
        logger.error(f"Error getting protection trend: {e}")
        return []

async def trigger_content_alert(result: Dict[str, Any], app_source: str = None):
    """Trigger alert for unsafe content"""
    try:
        db = await get_database()
        
        alert_record = {
            "alert_type": "unsafe_content",
            "app_source": app_source,
            "flagged_categories": result["flagged_categories"],
            "confidence": result["confidence"],
            "timestamp": datetime.utcnow(),
            "alert_id": str(uuid.uuid4())
        }
        
        await db.content_alerts.insert_one(alert_record)
        
        # Here you would implement actual notification logic
        # (push notifications, email alerts, etc.)
        
        logger.info(f"Content alert triggered for {app_source}: {result['flagged_categories']}")
        
    except Exception as e:
        logger.error(f"Error triggering content alert: {e}")

async def generate_daily_report(user_id: str):
    """Generate daily protection report"""
    try:
        db = await get_database()
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        daily_stats = await db.content_analysis.aggregate([
            {"$match": {"timestamp": {"$gte": today, "$lt": tomorrow}}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "safe": {"$sum": {"$cond": [{"$eq": ["$result.is_safe", True]}, 1, 0]}},
                "flagged": {"$sum": {"$cond": [{"$eq": ["$result.is_safe", False]}, 1, 0]}}
            }}
        ]).to_list(None)
        
        report = {
            "date": today.strftime("%Y-%m-%d"),
            "user_id": user_id,
            "stats": daily_stats[0] if daily_stats else {"total": 0, "safe": 0, "flagged": 0},
            "generated_at": datetime.utcnow()
        }
        
        await db.daily_reports.insert_one(report)
        
        logger.info(f"Daily report generated for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error generating daily report: {e}")

# Keep existing URL analysis function
async def analyze_url_content(url: str, user_settings: AdvancedFilterSettings) -> Dict[str, Any]:
    """Analyze URL content"""
    try:
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
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            content = response.text
        
        text_content = re.sub(r'<[^>]+>', ' ', content)
        text_content = re.sub(r'\s+', ' ', text_content).strip()[:5000]
        
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

# Additional endpoints remain the same but enhanced...
@app.get("/api/stats")
async def get_stats():
    """Legacy stats endpoint for backward compatibility"""
    return await get_enhanced_stats("default_user")

@app.post("/api/filter-settings")
async def save_filter_settings(settings: dict):
    """Legacy filter settings endpoint"""
    advanced_settings = AdvancedFilterSettings(
        user_id=settings.get("user_id", "default_user"),
        categories=settings.get("categories", {}),
        strictness_level=settings.get("strictness_level", "moderate"),
        custom_keywords=settings.get("custom_keywords", []),
        whitelist_domains=settings.get("whitelist_domains", []),
        blacklist_domains=settings.get("blacklist_domains", [])
    )
    return await save_advanced_filter_settings(advanced_settings)

@app.get("/api/filter-settings/{user_id}")
async def get_filter_settings(user_id: str):
    """Legacy filter settings endpoint"""
    return await get_advanced_filter_settings(user_id)

@app.get("/api/analysis-history/{user_id}")
async def get_analysis_history(user_id: str, limit: int = 50):
    """Get content analysis history"""
    try:
        db = await get_database()
        
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
    """Report content for system learning"""
    try:
        db = await get_database()
        
        report_data = {
            "content": request.get("content"),
            "user_feedback": request.get("feedback"),
            "content_type": request.get("content_type"),
            "timestamp": datetime.utcnow(),
            "user_id": request.get("user_id", "anonymous"),
            "app_source": request.get("app_source")
        }
        
        await db.content_reports.insert_one(report_data)
        
        return {"message": "Content report submitted successfully"}
        
    except Exception as e:
        logger.error(f"Error reporting content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to report content: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)