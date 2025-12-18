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

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.models.content import ContentDraft, ContentPerformance
from app.models.content_pattern import ContentPattern
from app.core.config import settings
from app.services.analysis_engine import AnalysisEngine
import json
import re


class NLQueryService:
    """
    Processes natural language queries about user analytics.
    Uses Gemini API when available, falls back to smart mock responses.
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
    
    def _get_openai_client(self):
        """Lazy initialization of OpenAI client."""
        if self._openai_client is None and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            except ImportError:
                print("⚠️ openai package not installed. Using mock responses.")
            except Exception as e:
                print(f"⚠️ OpenAI init error: {e}. Using mock responses.")
        return self._openai_client
    
    # ========================================
    # CONTEXT BUILDING
    # ========================================
    
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
        
        # Only use mock if absolutely no data (for demo purposes)
        if not context["posts"] and not context["scraped_platforms"]:
            print("⚠️ No real data found, using demo context")
            context = self._get_mock_context()
            
        return context
    
    def _get_mock_context(self) -> Dict[str, Any]:
        """Return mock context for demos."""
        return {
            "user_id": self.user_id,
            "generated_at": datetime.utcnow().isoformat(),
            "posts": [
                {"platform": "linkedin", "text_preview": "Just shipped a new feature...", "views": 2500, "likes": 120, "comments": 45, "shares": 12, "engagement": 177, "created_at": "2024-12-01"},
                {"platform": "twitter", "text_preview": "Thread: 10 lessons from building...", "views": 8500, "likes": 340, "comments": 89, "shares": 156, "engagement": 585, "created_at": "2024-12-05"},
                {"platform": "linkedin", "text_preview": "Why I stopped chasing viral content...", "views": 4200, "likes": 230, "comments": 67, "shares": 34, "engagement": 331, "created_at": "2024-12-08"},
                {"platform": "twitter", "text_preview": "Hot take: Most productivity advice...", "views": 12000, "likes": 890, "comments": 234, "shares": 445, "engagement": 1569, "created_at": "2024-12-10"},
                {"platform": "instagram", "text_preview": "Behind the scenes of my workflow...", "views": 3400, "likes": 450, "comments": 23, "shares": 8, "engagement": 481, "created_at": "2024-12-12"},
            ],
            "patterns": [
                {"type": "content_type", "platform": "all", "multiplier": 2.3, "explanation": "Posts with personal stories perform 2.3× better"},
                {"type": "posting_time", "platform": "all", "multiplier": 1.8, "explanation": "Posts between 8-9 PM get 1.8× more engagement"},
                {"type": "caption_structure", "platform": "twitter", "multiplier": 1.6, "explanation": "Thread-style posts drive 1.6× more shares"},
            ],
            "summary": {
                "total_posts": 5,
                "total_views": 30600,
                "total_likes": 2030,
                "total_comments": 458,
                "total_shares": 655,
                "platforms": {
                    "linkedin": {"count": 2, "engagement": 508},
                    "twitter": {"count": 2, "engagement": 2154},
                    "instagram": {"count": 1, "engagement": 481}
                }
            }
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
        analysis = AnalysisEngine(
            content_data=context.get("posts", []),
            patterns=context.get("patterns", [])
        ).run_full_analysis(query)
        
        # Try OpenAI for natural language explanation
        openai_client = self._get_openai_client()
        
        if openai_client:
            try:
                explanation = self._generate_with_openai_jarvis(query, context, intent, analysis)
                source = "openai"
            except Exception as e:
                print(f"OpenAI error: {e}")
                explanation = analysis["reason"]
                source = "jarvis"
        else:
            explanation = analysis["reason"]
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
        analysis_summary = f"""
ANALYSIS RESULTS:
- Trend: {analysis['trend']['trend_direction']} ({analysis['trend']['change_percent']}% change)
- Top cause: {analysis['diagnosis']['primary_cause']['cause'] if analysis['diagnosis'].get('primary_cause') else 'Not enough data'}
- Confidence: {analysis['confidence']*100:.0f}%

TOP ACTION: {analysis['actions'][0]['title'] if analysis['actions'] else 'Keep posting'}
"""

        response = self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User asked: {query}\n\n{analysis_summary}\n\nExplain this to the user:"}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    def _generate_with_openai(self, query: str, context: Dict, intent: str) -> str:
        """Generate response using OpenAI API."""
        
        system_prompt = """You are an AI analytics assistant for content creators. 
You help them understand their content performance and make data-driven decisions.

Be concise, actionable, and friendly. Use numbers and specific insights.
Format responses in a conversational but professional tone.
Use bullet points for lists. Bold important numbers using **bold**.

When giving advice:
1. Start with a direct answer
2. Support with data from the context
3. End with a specific actionable recommendation"""

        context_summary = f"""
USER'S ANALYTICS DATA:
- Total Posts: {context['summary']['total_posts']}
- Total Views: {context['summary']['total_views']:,}
- Total Engagement: {context['summary']['total_likes'] + context['summary']['total_comments'] + context['summary']['total_shares']:,}
- Platforms: {', '.join(context['summary']['platforms'].keys())}

TOP PERFORMING POSTS:
{self._format_top_posts(context['posts'])}

DETECTED PATTERNS:
{self._format_patterns(context['patterns'])}
"""

        response = self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{context_summary}\n\nUSER QUESTION: {query}"}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
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
        """Generate smart mock response based on intent and context."""
        
        summary = context["summary"]
        posts = context["posts"]
        patterns = context["patterns"]
        
        # Sort posts by engagement
        top_posts = sorted(posts, key=lambda x: x.get("engagement", 0), reverse=True)
        
        # Get best platform
        platforms = summary.get("platforms", {})
        best_platform = max(platforms.items(), key=lambda x: x[1]["engagement"]) if platforms else ("N/A", {"engagement": 0})
        
        responses = {
            "repeat_posts": f"""📊 **Based on your data, here are posts worth repeating:**

1. **"{top_posts[0]['text_preview']}..."** ({top_posts[0]['platform']})
   - {top_posts[0]['engagement']:,} engagements | {top_posts[0]['views']:,} views

2. **"{top_posts[1]['text_preview']}..."** ({top_posts[1]['platform']}) 
   - {top_posts[1]['engagement']:,} engagements | {top_posts[1]['views']:,} views

💡 **Recommendation:** Repurpose your top Twitter thread into a LinkedIn carousel. Thread-style content drives **1.6×** more shares on your account.""",

            "engagement_drop": f"""📉 **Analyzing your engagement patterns...**

Based on your data, here are likely factors:

1. **Posting consistency** - Gaps between posts reduce algorithmic reach
2. **Content mix change** - Your highest performers include personal stories
3. **Timing variance** - Posts at 8-9 PM get **1.8×** better engagement

📈 **To recover:**
- Return to the content style that got **{top_posts[0]['engagement']:,}** engagements
- Post consistently for 2 weeks at optimal times
- Focus on {best_platform[0]} where you see strongest results""",

            "best_content": f"""🎯 **What works best for your audience:**

Looking at your **{summary['total_posts']}** posts with **{summary['total_views']:,}** total views:

**Top Content Patterns:**
{self._format_patterns(patterns)}

**Your Best Platform:** {best_platform[0].capitalize()} ({best_platform[1]['engagement']:,} total engagement)

💡 **Insight:** Your audience responds best to authentic, story-driven content. Posts with personal experiences perform **2.3×** better than generic advice.""",

            "optimal_timing": f"""⏰ **Your optimal posting times:**

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

🏆 **Winner:** {best_platform[0].capitalize()} with **{best_platform[1]['engagement']:,}** total engagement

💡 **Suggestion:** Consider cross-posting your top {best_platform[0]} content to other platforms.""",

            "growth_advice": f"""🚀 **Growth Strategy Based on Your Data:**

You have **{summary['total_views']:,}** views across **{summary['total_posts']}** posts. Here's how to grow:

1. **Double down on {best_platform[0]}** - Your strongest platform
2. **Repeat winners** - Your top post got **{top_posts[0]['engagement']:,}** engagements
3. **Post at peak times** - 8-9 PM drives **1.8×** more reach
4. **Use proven formats** - Thread-style content on Twitter gets **60%** more shares

🎯 **30-day challenge:** Post daily at 8 PM, alternating between stories and insights.""",

            "general": f"""I analyzed your **{summary['total_posts']}** posts with **{summary['total_views']:,}** total views.

**Quick insights:**
- Best platform: **{best_platform[0].capitalize()}**
- Top engagement: **{top_posts[0]['engagement']:,}** on one post
- Total engagement: **{summary['total_likes'] + summary['total_comments'] + summary['total_shares']:,}**

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
