"""
Creator OS AI Agent Service
Enterprise-grade AI agent with Gemini/OpenAI, function calling, and memory.
"""
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlmodel import Session, select
import json
import os
import uuid

# Models
from app.models.conversation_memory import Conversation, Message
from app.models.scraped_analytics import ScrapedAnalytics
from app.models.content import ContentDraft, ContentPerformance
from app.models.content_pattern import ContentPattern

# Services
from app.services.analysis_engine import AnalysisEngine
from app.core.config import settings


class CreatorAgent:
    """
    Enterprise AI Agent for Content Creators.
    
    Features:
    - Gemini 2.0 Flash with function calling (primary)
    - OpenAI GPT-4 fallback
    - Conversation memory
    - Real-time analytics access
    - Context-aware responses
    """
    
    SYSTEM_PROMPT = """You are Creator OS, an elite AI strategist for content creators.

You are the user's personal growth advisor. You have real-time access to their analytics 
across YouTube, Instagram, LinkedIn, and other platforms.

PERSONALITY:
- Direct and data-driven, never vague
- Encouraging but honest about problems
- Use specific numbers and actionable advice
- Like a smart friend who's also a growth expert

CAPABILITIES:
- Analyze their content performance
- Explain why metrics changed
- Suggest optimal posting times
- Recommend content strategies
- Generate content ideas
- Compare platform performance

RESPONSE FORMAT:
- Keep responses concise (2-4 sentences for simple questions)
- Use **bold** for key numbers and insights
- Use bullet points for lists
- End with one specific action when relevant

RULES:
- CRITICAL: Never fabricate, invent, or make up numbers, statistics, or analytics data
- If you don't have data, clearly state "I don't have any analytics data for you yet" and explain how to get it
- Only reference specific posts and metrics when they actually exist in the provided data
- If has_data is False or no platforms exist, never pretend data exists
- Be proactive about identifying problems and opportunities when data IS available"""

    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self._model = None
        self._openai_client = None
        self._use_openai = False
        self._tools = self._build_tools()
        
    def _get_model(self):
        """Initialize AI model - prefers Gemini, falls back to OpenRouter/DeepSeek/OpenAI."""
        if self._model is None:
            # Try Gemini first
            gemini_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
            if gemini_key:
                genai.configure(api_key=gemini_key)
                self._model = genai.GenerativeModel(
                    model_name="gemini-2.0-flash-exp",
                    system_instruction=self.SYSTEM_PROMPT,
                    tools=[self._tools]
                )
                self._use_openai = False
                return self._model
            
            # Try OpenRouter (OpenAI-compatible API)
            openrouter_key = os.getenv("OPENROUTER_API_KEY")
            openrouter_model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")  # Default model
            if openrouter_key:
                try:
                    from openai import OpenAI
                    self._openai_client = OpenAI(
                        api_key=openrouter_key,
                        base_url="https://openrouter.ai/api/v1"
                    )
                    self._use_openai = True
                    self._model_name = openrouter_model
                    return None
                except ImportError:
                    raise ValueError("OpenAI package not installed. Run: pip install openai")
            
            # Try DeepSeek (OpenAI-compatible API)
            deepseek_key = os.getenv("DEEPSEEK_API_KEY")
            if deepseek_key:
                try:
                    from openai import OpenAI
                    self._openai_client = OpenAI(
                        api_key=deepseek_key,
                        base_url="https://api.deepseek.com"
                    )
                    self._use_openai = True
                    self._model_name = "deepseek-chat"
                    return None
                except ImportError:
                    raise ValueError("OpenAI package not installed. Run: pip install openai")
            
            # Fall back to OpenAI
            openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
            if openai_key:
                try:
                    from openai import OpenAI
                    self._openai_client = OpenAI(api_key=openai_key)
                    self._use_openai = True
                    self._model_name = "gpt-4o-mini"
                    return None
                except ImportError:
                    raise ValueError("OpenAI package not installed. Run: pip install openai")
            
            raise ValueError("No AI API key configured. Set GOOGLE_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY")
        return self._model
    
    def _build_tools(self) -> Tool:
        """Define function calling tools for the agent."""
        
        get_analytics_summary = FunctionDeclaration(
            name="get_analytics_summary",
            description="Get the user's overall analytics summary including views, engagement, and followers across all platforms. Use this to answer general performance questions.",
            parameters={
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to look back (default 30)"
                    },
                    "platform": {
                        "type": "string",
                        "description": "Specific platform to filter by (youtube, instagram, linkedin), or 'all'"
                    }
                }
            }
        )
        
        get_top_posts = FunctionDeclaration(
            name="get_top_posts",
            description="Get the user's best performing posts ranked by engagement. Use this when user asks about successful content.",
            parameters={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of top posts to return (default 5)"
                    },
                    "platform": {
                        "type": "string",
                        "description": "Filter by platform"
                    },
                    "metric": {
                        "type": "string",
                        "description": "Metric to rank by: engagement, views, likes, shares"
                    }
                }
            }
        )
        
        analyze_engagement_trend = FunctionDeclaration(
            name="analyze_engagement_trend",
            description="Analyze why engagement changed over time. Use this when user asks about drops, increases, or changes in performance.",
            parameters={
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to analyze"
                    }
                }
            }
        )
        
        get_optimal_posting_times = FunctionDeclaration(
            name="get_optimal_posting_times",
            description="Get the best times to post based on historical engagement data.",
            parameters={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "Platform to get times for"
                    }
                }
            }
        )
        
        generate_content_ideas = FunctionDeclaration(
            name="generate_content_ideas",
            description="Generate content ideas based on what has worked well for the user.",
            parameters={
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "Number of ideas to generate (default 3)"
                    },
                    "platform": {
                        "type": "string",
                        "description": "Target platform"
                    },
                    "topic": {
                        "type": "string",
                        "description": "Specific topic or theme to focus on"
                    }
                }
            }
        )
        
        get_platform_comparison = FunctionDeclaration(
            name="get_platform_comparison",
            description="Compare performance across different platforms.",
            parameters={
                "type": "object",
                "properties": {}
            }
        )
        
        diagnose_problem = FunctionDeclaration(
            name="diagnose_problem",
            description="Diagnose why engagement or views might be low. Provides root cause analysis.",
            parameters={
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "description": "Metric with the problem: views, engagement, followers"
                    }
                }
            }
        )
        
        return Tool(function_declarations=[
            get_analytics_summary,
            get_top_posts,
            analyze_engagement_trend,
            get_optimal_posting_times,
            generate_content_ideas,
            get_platform_comparison,
            diagnose_problem
        ])
    
    # ===== TOOL IMPLEMENTATIONS =====
    
    def _execute_tool(self, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return the result."""
        
        tool_map = {
            "get_analytics_summary": self._tool_get_analytics_summary,
            "get_top_posts": self._tool_get_top_posts,
            "analyze_engagement_trend": self._tool_analyze_engagement_trend,
            "get_optimal_posting_times": self._tool_get_optimal_posting_times,
            "generate_content_ideas": self._tool_generate_content_ideas,
            "get_platform_comparison": self._tool_get_platform_comparison,
            "diagnose_problem": self._tool_diagnose_problem,
        }
        
        if name not in tool_map:
            return {"error": f"Unknown tool: {name}"}
        
        try:
            return tool_map[name](**args)
        except Exception as e:
            return {"error": str(e)}
    
    def _tool_get_analytics_summary(self, days: int = 30, platform: str = "all") -> Dict:
        """Get overall analytics summary."""
        
        # Get scraped analytics
        statement = select(ScrapedAnalytics).where(
            ScrapedAnalytics.user_id == self.user_id
        )
        if platform != "all":
            statement = statement.where(ScrapedAnalytics.platform == platform.lower())
        
        statement = statement.order_by(ScrapedAnalytics.scraped_at.desc()).limit(10)
        scraped = self.db.exec(statement).all()
        
        # Get content performance
        content_statement = select(ContentDraft).where(ContentDraft.user_id == self.user_id)
        drafts = self.db.exec(content_statement).all()
        
        total_views = 0
        total_likes = 0
        total_comments = 0
        platforms_data = {}
        
        for s in scraped:
            if s.platform not in platforms_data:
                platforms_data[s.platform] = {"views": 0, "followers": 0, "subscribers": 0}
            platforms_data[s.platform]["views"] += s.views or 0
            platforms_data[s.platform]["followers"] = max(platforms_data[s.platform]["followers"], s.followers or 0)
            platforms_data[s.platform]["subscribers"] = max(platforms_data[s.platform]["subscribers"], s.subscribers or 0)
            total_views += s.views or 0
        
        for draft in drafts:
            perf_stmt = select(ContentPerformance).where(
                ContentPerformance.draft_id == draft.id
            ).order_by(ContentPerformance.recorded_at.desc())
            perf = self.db.exec(perf_stmt).first()
            
            if perf:
                total_likes += perf.likes
                total_comments += perf.comments
        
        # If no data, return mock
        if not scraped and not drafts:
            return {
                "note": "No analytics data found yet. Visit YouTube Studio or Instagram with the extension to start tracking.",
                "total_views": 0,
                "total_engagement": 0,
                "platforms": {},
                "has_data": False
            }
        
        return {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_engagement": total_likes + total_comments,
            "platforms": platforms_data,
            "posts_tracked": len(drafts),
            "has_data": True
        }
    
    def _tool_get_top_posts(self, limit: int = 5, platform: str = None, metric: str = "engagement") -> Dict:
        """Get top performing posts."""
        
        statement = select(ContentDraft).where(ContentDraft.user_id == self.user_id)
        if platform:
            statement = statement.where(ContentDraft.platform == platform.lower())
        
        drafts = self.db.exec(statement).all()
        
        posts_with_performance = []
        for draft in drafts:
            perf_stmt = select(ContentPerformance).where(
                ContentPerformance.draft_id == draft.id
            ).order_by(ContentPerformance.recorded_at.desc())
            perf = self.db.exec(perf_stmt).first()
            
            if perf:
                engagement = perf.likes + perf.comments + perf.shares
                posts_with_performance.append({
                    "text_preview": draft.text_content[:100] if draft.text_content else "",
                    "platform": draft.platform,
                    "views": perf.views,
                    "likes": perf.likes,
                    "comments": perf.comments,
                    "shares": perf.shares,
                    "engagement": engagement,
                    "created_at": draft.created_at.isoformat() if draft.created_at else None
                })
        
        # Sort by metric
        sort_key = metric if metric in ["views", "likes", "comments", "shares", "engagement"] else "engagement"
        posts_with_performance.sort(key=lambda x: x.get(sort_key, 0), reverse=True)
        
        return {
            "top_posts": posts_with_performance[:limit],
            "total_posts": len(posts_with_performance)
        }
    
    def _tool_analyze_engagement_trend(self, days: int = 30) -> Dict:
        """Analyze engagement trends."""
        
        # Get posts data
        statement = select(ContentDraft).where(ContentDraft.user_id == self.user_id)
        drafts = self.db.exec(statement).all()
        
        posts_data = []
        for draft in drafts:
            perf_stmt = select(ContentPerformance).where(
                ContentPerformance.draft_id == draft.id
            )
            perfs = self.db.exec(perf_stmt).all()
            
            for perf in perfs:
                posts_data.append({
                    "platform": draft.platform,
                    "views": perf.views,
                    "likes": perf.likes,
                    "comments": perf.comments,
                    "shares": perf.shares,
                    "engagement": perf.likes + perf.comments + perf.shares,
                    "created_at": perf.recorded_at.isoformat()
                })
        
        if not posts_data:
            return {"note": "Not enough data to analyze trends yet."}
        
        # Use analysis engine
        engine = AnalysisEngine(content_data=posts_data)
        trend = engine.trend_analysis(days=days)
        diagnosis = engine.engagement_diagnosis()
        
        return {
            "trend_direction": trend.get("trend_direction", "stable"),
            "change_percent": trend.get("change_percent", 0),
            "insight": trend.get("insight", ""),
            "primary_cause": diagnosis.get("primary_cause", {}),
            "contributing_factors": diagnosis.get("contributing_factors", [])
        }
    
    def _tool_get_optimal_posting_times(self, platform: str = None) -> Dict:
        """Get optimal posting times."""
        
        # Get patterns
        statement = select(ContentPattern).where(
            ContentPattern.user_id == self.user_id,
            ContentPattern.pattern_type == "posting_time"
        )
        if platform:
            statement = statement.where(ContentPattern.platform == platform.lower())
        
        patterns = self.db.exec(statement).all()
        
        if patterns:
            times = []
            for p in patterns:
                times.append({
                    "platform": p.platform,
                    "recommendation": p.explanation,
                    "multiplier": p.performance_multiplier
                })
            return {"optimal_times": times}
        
        # Default recommendations
        return {
            "optimal_times": [
                {"platform": "linkedin", "recommendation": "8-9 AM or 5-6 PM on weekdays", "multiplier": 1.5},
                {"platform": "twitter", "recommendation": "12 PM or 8 PM", "multiplier": 1.4},
                {"platform": "instagram", "recommendation": "6-9 PM", "multiplier": 1.6},
                {"platform": "youtube", "recommendation": "2-4 PM on weekdays, 9-11 AM weekends", "multiplier": 1.3}
            ],
            "note": "These are general recommendations. Keep tracking to get personalized times."
        }
    
    def _tool_generate_content_ideas(self, count: int = 3, platform: str = None, topic: str = None) -> Dict:
        """Generate content ideas based on what works."""
        
        # Get top performing content
        top_posts = self._tool_get_top_posts(limit=5, platform=platform)
        
        # Get patterns
        patterns_stmt = select(ContentPattern).where(ContentPattern.user_id == self.user_id).limit(5)
        patterns = self.db.exec(patterns_stmt).all()
        
        # Build ideas based on patterns
        ideas = []
        
        if top_posts.get("top_posts"):
            best = top_posts["top_posts"][0]
            ideas.append({
                "idea": f"Expand on your best post: '{best['text_preview'][:50]}...'",
                "reason": f"This got {best['engagement']} engagements",
                "format": "Thread or long-form"
            })
        
        if patterns:
            for p in patterns[:2]:
                ideas.append({
                    "idea": f"Apply the '{p.pattern_type}' pattern that works for you",
                    "reason": p.explanation,
                    "format": p.platform.capitalize() if p.platform else "Any"
                })
        
        # Add generic ideas based on topic
        if topic:
            ideas.append({
                "idea": f"Personal story about your experience with {topic}",
                "reason": "Personal stories typically get 2x engagement",
                "format": "Story post"
            })
        
        if len(ideas) < count:
            ideas.extend([
                {"idea": "Behind-the-scenes of your work", "reason": "Authenticity builds connection", "format": "Photo/Video"},
                {"idea": "Contrarian take on a popular opinion", "reason": "Debate drives engagement", "format": "Text post"},
                {"idea": "Lessons learned from a recent failure", "reason": "Vulnerability resonates", "format": "Thread"}
            ])
        
        return {"ideas": ideas[:count]}
    
    def _tool_get_platform_comparison(self) -> Dict:
        """Compare performance across platforms."""
        
        summary = self._tool_get_analytics_summary(days=30, platform="all")
        
        if not summary.get("has_data"):
            return summary
        
        platforms = summary.get("platforms", {})
        
        comparison = []
        for platform, data in platforms.items():
            comparison.append({
                "platform": platform,
                "views": data.get("views", 0),
                "followers": data.get("followers", 0),
                "subscribers": data.get("subscribers", 0)
            })
        
        # Sort by views
        comparison.sort(key=lambda x: x["views"], reverse=True)
        
        best = comparison[0] if comparison else None
        
        return {
            "comparison": comparison,
            "best_platform": best["platform"] if best else None,
            "recommendation": f"Focus on {best['platform']} - it's your strongest performer" if best else "Start tracking to compare"
        }
    
    def _tool_diagnose_problem(self, metric: str = "engagement") -> Dict:
        """Diagnose performance problems."""
        
        # Get trend analysis
        trend = self._tool_analyze_engagement_trend(days=30)
        
        return {
            "metric": metric,
            "diagnosis": trend.get("primary_cause", {}),
            "contributing_factors": trend.get("contributing_factors", []),
            "recommendation": "Increase posting frequency and focus on your top-performing content types"
        }
    
    # ===== CHAT METHODS =====
    
    def chat(self, message: str, conversation_id: Optional[uuid.UUID] = None, 
             page_context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a chat message and return the response.
        
        Args:
            message: User's message
            conversation_id: Existing conversation to continue
            page_context: Current page context from extension
        
        Returns:
            Response with message content and metadata
        """
        
        start_time = datetime.utcnow()
        
        # Get or create conversation
        if conversation_id:
            conversation = self.db.get(Conversation, conversation_id)
            if not conversation or conversation.user_id != self.user_id:
                conversation = self._create_conversation(message, page_context)
        else:
            conversation = self._create_conversation(message, page_context)
        
        # Load conversation history
        history = self._load_history(conversation.id)
        
        # Add page context to message if available
        user_message = message
        if page_context:
            context_str = f"\n\n[Context: User is viewing {page_context.get('url', 'unknown page')}]"
            if page_context.get('visible_metrics'):
                context_str += f"\n[Visible metrics: {json.dumps(page_context['visible_metrics'])}]"
            user_message = message + context_str
        
        # Save user message
        self._save_message(conversation.id, "user", user_message)
        
        # Initialize model (sets _use_openai flag)
        self._get_model()
        
        # Route to appropriate backend
        if self._use_openai:
            response_text = self._chat_openai(user_message, history)
        else:
            response_text = self._chat_gemini(user_message, history, conversation.id)
        
        # Calculate latency
        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Save assistant response
        msg = self._save_message(
            conversation.id, "assistant", response_text,
            latency_ms=latency_ms
        )
        
        # Update conversation
        conversation.last_message_at = datetime.utcnow()
        conversation.message_count += 2  # User + assistant
        self.db.add(conversation)
        self.db.commit()
        
        return {
            "message_id": str(msg.id),
            "conversation_id": str(conversation.id),
            "content": response_text,
            "latency_ms": latency_ms
        }
    
    def _chat_openai(self, message: str, history: List) -> str:
        """Chat using OpenAI API."""
        try:
            # Build messages with history
            messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
            
            for h in history:
                role = "user" if h["role"] == "user" else "assistant"
                messages.append({"role": role, "content": h["parts"][0] if h["parts"] else ""})
            
            messages.append({"role": "user", "content": message})
            
            # ALWAYS inject analytics context - crucial to prevent hallucination
            analytics = self._tool_get_analytics_summary()
            if analytics.get("has_data"):
                messages.append({
                    "role": "system", 
                    "content": f"[User Analytics Data: {json.dumps(analytics)}]"
                })
            else:
                # Explicitly tell the AI there's no data to prevent hallucination
                messages.append({
                    "role": "system", 
                    "content": "[CRITICAL: This user has NO analytics data yet. has_data=False. platforms={empty}. Do NOT make up any numbers, statistics, views, subscribers, or engagement metrics. Tell the user they need to visit YouTube Studio or Instagram with the extension active to start collecting data.]"
                })
            
            # Call OpenAI/DeepSeek
            model_name = getattr(self, '_model_name', 'gpt-4o-mini')
            response = self._openai_client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"I encountered an error: {str(e)}. Please check your OpenAI API key configuration."
    
    def _chat_gemini(self, message: str, history: List, conversation_id: uuid.UUID) -> str:
        """Chat using Gemini API with function calling."""
        try:
            chat = self._model.start_chat(history=history)
            response = chat.send_message(message)
            
            # Handle function calls
            while response.candidates[0].content.parts:
                part = response.candidates[0].content.parts[0]
                
                if hasattr(part, 'function_call') and part.function_call:
                    # Execute tool
                    fn_call = part.function_call
                    tool_result = self._execute_tool(fn_call.name, dict(fn_call.args))
                    
                    # Save tool call
                    self._save_message(
                        conversation_id, "tool", 
                        json.dumps(tool_result),
                        tool_name=fn_call.name,
                        tool_arguments=dict(fn_call.args),
                        tool_result=tool_result
                    )
                    
                    # Continue with tool result
                    response = chat.send_message(
                        genai.protos.Content(
                            parts=[genai.protos.Part(
                                function_response=genai.protos.FunctionResponse(
                                    name=fn_call.name,
                                    response={"result": tool_result}
                                )
                            )]
                        )
                    )
                else:
                    break
            
            return response.text
            
        except Exception as e:
            return f"I encountered an error: {str(e)}. Let me try a simpler approach."
    
    def _create_conversation(self, first_message: str, page_context: Optional[Dict] = None) -> Conversation:
        """Create a new conversation."""
        
        # Generate title from first message
        title = first_message[:50] + "..." if len(first_message) > 50 else first_message
        
        # Detect platform context
        platform = None
        if page_context:
            url = page_context.get("url", "")
            if "youtube" in url.lower():
                platform = "youtube"
            elif "instagram" in url.lower():
                platform = "instagram"
            elif "linkedin" in url.lower():
                platform = "linkedin"
            elif "twitter" in url.lower() or "x.com" in url.lower():
                platform = "twitter"
        
        conversation = Conversation(
            user_id=self.user_id,
            title=title,
            platform_context=platform,
            page_url=page_context.get("url") if page_context else None
        )
        
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        
        return conversation
    
    def _load_history(self, conversation_id: uuid.UUID, limit: int = 20) -> List:
        """Load conversation history for Gemini."""
        
        statement = select(Message).where(
            Message.conversation_id == conversation_id,
            Message.role.in_(["user", "assistant"])
        ).order_by(Message.created_at.desc()).limit(limit)
        
        messages = self.db.exec(statement).all()
        messages.reverse()  # Chronological order
        
        history = []
        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            history.append({
                "role": role,
                "parts": [msg.content]
            })
        
        return history
    
    def _save_message(self, conversation_id: uuid.UUID, role: str, content: str,
                      tool_name: str = None, tool_arguments: Dict = None,
                      tool_result: Dict = None, latency_ms: int = None) -> Message:
        """Save a message to the database."""
        
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_name=tool_name,
            tool_arguments=tool_arguments,
            tool_result=tool_result,
            latency_ms=latency_ms
        )
        
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        
        return msg
    
    # ===== CONVERSATION MANAGEMENT =====
    
    def get_conversations(self, limit: int = 20) -> List[Dict]:
        """Get user's conversation history."""
        
        statement = select(Conversation).where(
            Conversation.user_id == self.user_id,
            Conversation.is_archived.is_(False)
        ).order_by(Conversation.last_message_at.desc()).limit(limit)
        
        conversations = self.db.exec(statement).all()
        
        result = []
        for conv in conversations:
            # Get last message preview
            last_msg_stmt = select(Message).where(
                Message.conversation_id == conv.id,
                Message.role == "assistant"
            ).order_by(Message.created_at.desc()).limit(1)
            last_msg = self.db.exec(last_msg_stmt).first()
            
            result.append({
                "id": str(conv.id),
                "title": conv.title,
                "platform_context": conv.platform_context,
                "message_count": conv.message_count,
                "last_message_at": conv.last_message_at.isoformat(),
                "preview": last_msg.content[:100] if last_msg else None
            })
        
        return result
    
    def get_conversation_messages(self, conversation_id: uuid.UUID) -> List[Dict]:
        """Get all messages in a conversation."""
        
        statement = select(Message).where(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc())
        
        messages = self.db.exec(statement).all()
        
        return [
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "tool_name": msg.tool_name,
                "tool_result": msg.tool_result,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
