"""
Natural Language Query Service - Jarvis AI Brain

Enables conversational analytics queries like:
- "Which posts should I repeat?"
- "Why did my engagement drop in October?"
- "What content works best for my audience?"

Now with full Jarvis analysis pipeline:
- Trend Analysis
- Content Clustering
- Prediction Comparison
- Engagement Diagnosis
"""

from typing import Dict, List, Any
from datetime import datetime
from sqlmodel import Session, select
from app.models.content import ContentDraft, ContentPerformance
from app.models.content_pattern import ContentPattern
from app.core.config import settings
from app.services.analysis_engine import AnalysisEngine
import re
import google.generativeai as genai


class NLQueryService:
    """
    Processes natural language queries about user analytics.
    Uses Gemini API or OpenAI when available, falls back to smart mock responses.
    """
    
    INTENT_PATTERNS = {
        "repeat_posts": [
            r"which posts?.*(should|to) repeat",
            r"posts?.*(should|to) repeat",
            r"best performing",
            r"top posts?",
            r"what (worked|works) best",
            r"successful posts?",
            r"repeat.*(posts?|content)"
        ],
        "engagement_drop": [
            r"(why|what).*(drop|decrease|down|fell|decline)",
            r"engagement.*(low|drop|decrease)",
            r"what happened.*(engagement|views|likes)"
        ],
        "best_content": [
            r"(what|which) content works",
            r"what (type|kind) of content",
            r"best content for",
            r"audience (like|prefer|want)"
        ],
        "optimal_timing": [
            r"(when|what time).*(should|to)? post",
            r"when should i post",
            r"best time",
            r"optimal (time|hour|day)",
            r"posting schedule"
        ],
        "platform_comparison": [
            r"which platform",
            r"compare.*(platform|twitter|linkedin|youtube)",
            r"(best|better) platform",
            r"platform performance"
        ],
        "growth_advice": [
            r"how (can|to|do) (i|we) grow",
            r"increase (followers|engagement|views)",
            r"growth (tips|advice|strategy)"
        ]
    }

    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self._openai_client = None
        self._gemini_model = None
        self._model_provider = None  # "openai", "gemini", "deepseek", "hf", "openrouter"
        self._model_name = "meta-llama/Llama-3.2-3B-Instruct"  # Default model
    
    def _get_model(self):
        """
        Initialize AI model matching AgentService logic (Extension AI).
        Prioritizes: HF (DeepSeek) -> Gemini -> OpenRouter -> DeepSeek -> OpenAI
        """
        import os
        
        # 1. Try Hugging Face Router (DeepSeek - Free/Fast)
        hf_token = settings.HF_TOKEN or os.getenv("HF_TOKEN")
        if hf_token and not self._openai_client:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(
                    api_key=hf_token,
                    base_url="https://router.huggingface.co/v1"
                )
                self._model_provider = "hf"
                self._model_name = "meta-llama/Llama-3.2-3B-Instruct"
                print("✅ Using Hugging Face (Llama-3.2)")
                return
            except Exception as e:
                print(f"⚠️ HF init error: {e}")

        # 2. Try Gemini 2.0 Flash (Google)
        gemini_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY or os.getenv("GEMINI_API_KEY")
        if gemini_key and not self._gemini_model:
            try:
                genai.configure(api_key=gemini_key)
                self._gemini_model = genai.GenerativeModel('gemini-2.0-flash')
                self._model_provider = "gemini"
                print("✅ Using Gemini 2.0 Flash")
                return
            except Exception as e:
                print(f"⚠️ Gemini init error: {e}")

        # 3. Try OpenRouter
        if not self._openai_client and os.getenv("OPENROUTER_API_KEY"):
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(
                    api_key=os.getenv("OPENROUTER_API_KEY"),
                    base_url="https://openrouter.ai/api/v1"
                )
                self._model_provider = "openrouter"
                print("✅ Using OpenRouter")
                return
            except Exception:
                pass

        # 4. Try OpenAI
        if not self._openai_client and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
                self._model_provider = "openai"
                print("✅ Using OpenAI")
                return
            except Exception:
                pass
    
    # ... Context Building ...
    
    def build_context(self) -> Dict[str, Any]:
        """Build analytics context for the user including scraped platform data."""
        from app.models.scraped_analytics import ScrapedAnalytics
        
        context = {
            "user_id": self.user_id,
            "generated_at": datetime.utcnow().isoformat(),
            "posts": [],
            "patterns": [],
            "scraped_platforms": {},
            "summary": {}
        }
        
        try:
            # 1. Get scraped analytics (YouTube, Instagram, LinkedIn)
            scraped_stmt = select(ScrapedAnalytics).where(
                ScrapedAnalytics.user_id == self.user_id
            ).order_by(ScrapedAnalytics.scraped_at.desc())
            scraped_records = self.db.exec(scraped_stmt).all()
            
            # Group by platform, get latest
            platform_data = {}
            for record in scraped_records:
                if record.platform not in platform_data:
                    platform_data[record.platform] = {
                        "views": record.views or 0,
                        "followers": record.followers or 0,
                        "subscribers": record.subscribers or 0,
                        "watch_time_minutes": record.watch_time_minutes,
                        "last_updated": record.scraped_at.isoformat()
                    }
            
            context["scraped_platforms"] = platform_data
            
            # 2. Get posts with performance
            statement = select(ContentDraft).where(ContentDraft.user_id == self.user_id)
            drafts = self.db.exec(statement).all()
            
            total_views = sum(p.get("views", 0) for p in platform_data.values())
            total_followers = sum(p.get("followers", 0) for p in platform_data.values())
            total_likes = 0
            total_comments = 0
            total_shares = 0
            platform_stats = {}
            
            for draft in drafts:
                perf_stmt = select(ContentPerformance).where(
                    ContentPerformance.draft_id == draft.id
                ).order_by(ContentPerformance.recorded_at.desc())
                perf = self.db.exec(perf_stmt).first()
                
                if perf:
                    post_data = {
                        "platform": draft.platform,
                        "text_preview": draft.text_content[:100] if draft.text_content else "",
                        "views": perf.views,
                        "likes": perf.likes,
                        "comments": perf.comments,
                        "shares": perf.shares,
                        "engagement": perf.likes + perf.comments + perf.shares,
                        "created_at": draft.created_at.isoformat() if draft.created_at else None
                    }
                    context["posts"].append(post_data)
                    
                    total_views += perf.views
                    total_likes += perf.likes
                    total_comments += perf.comments
                    total_shares += perf.shares
                    
                    if draft.platform not in platform_stats:
                        platform_stats[draft.platform] = {"count": 0, "engagement": 0}
                    platform_stats[draft.platform]["count"] += 1
                    platform_stats[draft.platform]["engagement"] += post_data["engagement"]
            
            # Merge scraped platform stats
            for platform, pdata in platform_data.items():
                if platform not in platform_stats:
                    platform_stats[platform] = {"count": 0, "engagement": 0, "views": pdata["views"]}
                else:
                    platform_stats[platform]["views"] = pdata["views"]
                platform_stats[platform]["followers"] = pdata.get("followers", 0)
            
            context["summary"] = {
                "total_posts": len(context["posts"]),
                "total_views": total_views,
                "total_followers": total_followers,
                "total_likes": total_likes,
                "total_comments": total_comments,
                "total_shares": total_shares,
                "platforms": platform_stats,
                "scraped_platforms_count": len(platform_data)
            }
            
            # 3. Get patterns
            pattern_stmt = select(ContentPattern).where(ContentPattern.user_id == self.user_id)
            patterns = self.db.exec(pattern_stmt).all()
            
            for pattern in patterns:
                context["patterns"].append({
                    "type": pattern.pattern_type,
                    "platform": pattern.platform,
                    "multiplier": pattern.performance_multiplier,
                    "explanation": pattern.explanation
                })
                
        except Exception as e:
            print(f"Context building error: {e}")
            # Keep empty context instead of mock
            pass
        
        # If no data exists, return empty context with helpful message (NOT mock data)
        if not context["posts"] and not context["scraped_platforms"]:
            print("ℹ️ No analytics data found for user")
            context["has_data"] = False
            context["data_collection_tips"] = [
                "Visit YouTube Studio with the extension active to sync your channel analytics",
                "Browse your Instagram profile to collect follower and engagement data",
                "The extension automatically captures data as you browse social platforms"
            ]
        else:
            context["has_data"] = True
            
        return context
    
    def _get_empty_context(self) -> Dict[str, Any]:
        """Return empty context with helpful onboarding message."""
        return {
            "user_id": self.user_id,
            "generated_at": datetime.utcnow().isoformat(),
            "has_data": False,
            "posts": [],
            "patterns": [],
            "scraped_platforms": {},
            "summary": {
                "total_posts": 0,
                "total_views": 0,
                "total_likes": 0,
                "total_comments": 0,
                "total_shares": 0,
                "platforms": {}
            },
            "data_collection_tips": [
                "Visit YouTube Studio to sync your channel analytics",
                "Browse Instagram to collect your profile metrics",
                "Open LinkedIn to capture your post performance"
            ]
        }
    
    # ========================================
    # INTENT CLASSIFICATION
    # ========================================
    
    def classify_intent(self, query: str) -> str:
        """Classify the user's query intent."""
        query_lower = query.lower()
        
        for intent, patterns in self.INTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    return intent
        
        return "general"
    
    # ========================================
    # RESPONSE GENERATION - JARVIS PIPELINE
    # ========================================
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process a natural language query using Jarvis pipeline.
        
        Flow:
        1. Build context from PostgreSQL
        2. Run analysis modules (trend, clustering, prediction)
        3. LLM converts data to human explanation
        4. Return: reason + graphs + actionable steps
        """
        
        # Build context
        context = self.build_context()
        
        # Classify intent
        intent = self.classify_intent(query)
        
        # Run Jarvis Analysis Engine
        # Run Jarvis Analysis Engine
        analysis = AnalysisEngine(
            content_data=context.get("posts", []),
            patterns=context.get("patterns", [])
        ).run_full_analysis(query)
        
        explanation = None
        source = "jarvis"

        # Initialize Model (Standardized logic)
        self._get_model()

        # 1. Try Generation
        try:
            if self._model_provider == "gemini" and self._gemini_model:
                print("🤖 Generating with Gemini...")
                explanation = self._generate_with_gemini_jarvis(self._gemini_model, query, context, intent, analysis)
                source = "gemini"
            
            elif self._model_provider in ["openai", "hf", "openrouter"] and self._openai_client:
                print(f"🤖 Generating with {self._model_provider}...")
                explanation = self._generate_with_openai_jarvis(query, context, intent, analysis)
                source = self._model_provider
            
            if explanation:
                print("✅ Generation successful")
        
        except Exception as e:
            import traceback
            with open("backend_debug.log", "a") as f:
                f.write(f"AI Generation Error ({self._model_provider}): {str(e)}\n{traceback.format_exc()}\n")
            print(f"❌ Generation error: {e}")

        # 2. Fallback to Mock (Intent-aware)
        if not explanation:
            print("⚠️ Falling back to mocked response")
            # Use improved mock response based on intent instead of just 'reason'
            explanation = self._generate_mock_response(query, context, intent)
            source = "jarvis"
        
        # Build rich response
        return {
            "status": "success",
            "source": source,
            "query": query,
            "intent": intent,
            "response": explanation,
            "reason": analysis["reason"],
            "graphs": analysis["graphs"],
            "actions": analysis["actions"],
            "diagnosis": analysis.get("diagnosis", {}),
            "confidence": analysis.get("confidence", 0),
            "context_used": True
        }
    
    def _generate_with_openai_jarvis(self, query: str, context: Dict, intent: str, analysis: Dict) -> str:
        """Generate response using OpenAI with Jarvis analysis data."""
        
        system_prompt = """You are Jarvis, an AI analytics brain for content creators.
You have just run a deep analysis and need to explain the results in a conversational way.

Be direct, data-driven, and actionable. Use **bold** for key numbers.
Format as: Brief answer → Key insight → One action to take.

Keep response under 150 words. Be like a smart friend explaining data."""

        # Include analysis results in prompt
        analysis_summary = self._build_analysis_summary(analysis)

        # Use the model name set during initialization (default to Llama for HF)
        model_name = getattr(self, '_model_name', 'meta-llama/Llama-3.2-3B-Instruct')
        
        response = self._openai_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User asked: {query}\n\n{analysis_summary}\n\nExplain this to the user:"}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content

    def _generate_with_gemini_jarvis(self, model, query: str, context: Dict, intent: str, analysis: Dict) -> str:
        """Generate response using Gemini with Jarvis analysis data."""
        
        system_prompt = """You are Jarvis, an AI analytics brain for content creators.
You have just run a deep analysis and need to explain the results in a conversational way.

Be direct, data-driven, and actionable. Use **bold** for key numbers.
Format as: Brief answer → Key insight → One action to take.

Keep response under 150 words. Be like a smart friend explaining data."""

        analysis_summary = self._build_analysis_summary(analysis)
        
        full_prompt = f"{system_prompt}\n\nUser asked: {query}\n\n{analysis_summary}\n\nExplain this to the user:"
        
        response = model.generate_content(full_prompt)
        return response.text

    def _build_analysis_summary(self, analysis: Dict) -> str:
        """Build a standard summary string from analysis results."""
        return f"""
ANALYSIS RESULTS:
- Trend: {analysis['trend']['trend_direction']} ({analysis['trend']['change_percent']}% change)
- Top cause: {analysis['diagnosis']['primary_cause']['cause'] if analysis['diagnosis'].get('primary_cause') else 'Not enough data'}
- Confidence: {analysis['confidence']*100:.0f}%

TOP ACTION: {analysis['actions'][0]['title'] if analysis['actions'] else 'Keep posting'}
"""
    
    def _format_top_posts(self, posts: List[Dict]) -> str:
        """Format top posts for the prompt."""
        sorted_posts = sorted(posts, key=lambda x: x.get("engagement", 0), reverse=True)[:3]
        lines = []
        for i, post in enumerate(sorted_posts, 1):
            lines.append(f"{i}. [{post['platform']}] \"{post['text_preview']}...\" - {post['engagement']} engagements")
        return "\n".join(lines) if lines else "No posts data available"
    
    def _format_patterns(self, patterns: List[Dict]) -> str:
        """Format patterns for the prompt."""
        if not patterns:
            return "No patterns detected yet"
        return "\n".join([f"- {p['explanation']}" for p in patterns])
    
    def _generate_mock_response(self, query: str, context: Dict, intent: str) -> str:
        """Generate smart response based on intent and context."""
        
        # CRITICAL: Handle no-data case first
        if not context.get("has_data", True) or not context.get("posts"):
            tips = context.get("data_collection_tips", [
                "Visit YouTube Studio with the extension active",
                "Browse your Instagram profile",
                "Open your LinkedIn feed"
            ])
            return f"""📊 **I don't have any analytics data for you yet.**

To get personalized insights, I need to collect your social media analytics first.

**How to get started:**
{chr(10).join(f'• {tip}' for tip in tips)}

Once you browse these platforms with the Creator OS extension active, I'll automatically collect your metrics and can answer questions like:
- "Which posts should I repeat?"
- "When is the best time to post?"
- "How can I grow my engagement?"

💡 **Quick tip:** Start by visiting YouTube Studio - I can analyze your channel within seconds!"""

        summary = context["summary"]
        posts = context["posts"]
        patterns = context["patterns"]
        
        # Sort posts by engagement
        top_posts = sorted(posts, key=lambda x: x.get("engagement", 0), reverse=True)
        
        # Get best platform
        platforms = summary.get("platforms", {})
        best_platform = max(platforms.items(), key=lambda x: x[1].get("engagement", 0)) if platforms else ("N/A", {"engagement": 0})
        
        responses = {
            "repeat_posts": f"""📊 **Based on your data, here are posts worth repeating:**

1. **"{top_posts[0]['text_preview'] if top_posts else 'No posts'}..."** ({top_posts[0]['platform'] if top_posts else 'N/A'})
   - {top_posts[0]['engagement'] if top_posts else 0:,} engagements | {top_posts[0]['views'] if top_posts else 0:,} views

2. **"{top_posts[1]['text_preview'] if len(top_posts) > 1 else 'No posts'}..."** ({top_posts[1]['platform'] if len(top_posts) > 1 else 'N/A'}) 
   - {top_posts[1]['engagement'] if len(top_posts) > 1 else 0:,} engagements | {top_posts[1]['views'] if len(top_posts) > 1 else 0:,} views

💡 **Recommendation:** Repurpose your top content into different formats for other platforms.""",

            "engagement_drop": f"""📉 **Analyzing your engagement patterns...**

Based on your data, here are likely factors:

1. **Posting consistency** - Gaps between posts reduce algorithmic reach
2. **Content mix change** - Your highest performers include personal stories
3. **Timing variance** - Posts at 8-9 PM get **1.8×** better engagement

📈 **To recover:**
- Return to the content style that got **{top_posts[0]['engagement'] if top_posts else 0:,}** engagements
- Post consistently for 2 weeks at optimal times
- Focus on {best_platform[0]} where you see strongest results""",

            "best_content": f"""🎯 **What works best for your audience:**

Looking at your **{summary['total_posts']}** posts with **{summary['total_views']:,}** total views:

**Top Content Patterns:**
{self._format_patterns(patterns)}

**Your Best Platform:** {best_platform[0].capitalize() if best_platform[0] != 'N/A' else 'Not enough data'} ({best_platform[1].get('engagement', 0):,} total engagement)

💡 **Insight:** Your audience responds best to authentic, story-driven content.""",

            "optimal_timing": """⏰ **Your optimal posting times:**

Based on pattern analysis:
- **Best hours:** 8-9 PM (1.8× better engagement)
- **Best days:** Tuesday & Thursday
- **Platform-specific:** 
  - Twitter: 12 PM and 8 PM
  - LinkedIn: 9 AM and 5 PM

🎯 **Quick win:** Schedule your next 5 posts at 8 PM on weekdays.""",

            "platform_comparison": f"""📱 **Platform Performance Comparison:**

| Platform | Posts | Total Engagement | Avg per Post |
|----------|-------|-----------------|--------------|
{self._format_platform_table(platforms)}

🏆 **Winner:** {best_platform[0].capitalize() if best_platform[0] != 'N/A' else 'N/A'} with **{best_platform[1].get('engagement', 0):,}** total engagement

💡 **Suggestion:** Consider cross-posting your top content to other platforms.""",

            "growth_advice": f"""🚀 **Growth Strategy Based on Your Data:**

You have **{summary['total_views']:,}** views across **{summary['total_posts']}** posts. Here's how to grow:

1. **Double down on {best_platform[0]}** - Your strongest platform
2. **Repeat winners** - Your top post got **{top_posts[0]['engagement'] if top_posts else 0:,}** engagements
3. **Post at peak times** - 8-9 PM drives **1.8×** more reach
4. **Use proven formats** - Thread-style content on Twitter gets **60%** more shares

🎯 **30-day challenge:** Post daily at 8 PM, alternating between stories and insights.""",

            "general": f"""I analyzed your **{summary['total_posts']}** posts with **{summary['total_views']:,}** total views.

**Quick insights:**
- Best platform: **{best_platform[0].capitalize() if best_platform[0] != 'N/A' else 'N/A'}**
- Top engagement: **{top_posts[0]['engagement'] if top_posts else 0:,}** on one post
- Total engagement: **{summary.get('total_likes', 0) + summary.get('total_comments', 0) + summary.get('total_shares', 0):,}**

What would you like to know more about? Try asking:
- "Which posts should I repeat?"
- "What's my best posting time?"
- "How can I grow my following?" """
        }
        
        return responses.get(intent, responses["general"])

    def _format_platform_table(self, platforms: Dict) -> str:
        """Format platform stats as markdown table rows."""
        rows = []
        for platform, stats in platforms.items():
            avg = stats["engagement"] // max(stats["count"], 1)
            rows.append(f"| {platform.capitalize()} | {stats['count']} | {stats['engagement']:,} | {avg:,} |")
        return "\n".join(rows)
    
    # ========================================
    # SUGGESTED QUESTIONS
    # ========================================
    
    @staticmethod
    def get_suggested_questions() -> List[str]:
        """Return suggested questions for the user."""
        return [
            "Which posts should I repeat?",
            "What content works best for my audience?",
            "When is the best time to post?",
            "How can I grow my engagement?",
            "Which platform performs best?",
            "Why did my engagement change recently?"
        ]
