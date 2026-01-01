"""
Enhanced Tool Registry - Plugin-style dynamic tool registration.
Provides centralized tool management with schema validation.
"""

from typing import Dict, Any, Callable, Optional, List, Type
from dataclasses import dataclass, field
from functools import wraps
import inspect
import logging

logger = logging.getLogger(__name__)


@dataclass
class ToolSchema:
    """Schema definition for a tool."""
    name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    returns: str = "Dict[str, Any]"
    version: str = "1.0.0"
    tags: List[str] = field(default_factory=list)
    requires_auth: bool = False


@dataclass
class ToolResult:
    """Result from tool execution."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    execution_time_ms: int = 0


class ToolRegistry:
    """
    Centralized registry for agent tools.
    
    Features:
    - Decorator-based registration
    - Schema validation
    - Tool versioning
    - Execution logging
    - Async support
    """
    
    _instance: Optional["ToolRegistry"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tools: Dict[str, Dict[str, Any]] = {}
            cls._instance._schemas: Dict[str, ToolSchema] = {}
        return cls._instance
    
    def register(
        self,
        name: Optional[str] = None,
        description: str = "",
        tags: List[str] = None,
        version: str = "1.0.0",
        requires_auth: bool = False
    ):
        """
        Decorator to register a tool.
        
        Usage:
            @registry.register(name="get_analytics", description="Fetch user analytics")
            def get_analytics(user_id: str, days: int = 30) -> Dict:
                ...
        """
        def decorator(func: Callable):
            tool_name = name or func.__name__
            
            # Extract parameter info from function signature
            sig = inspect.signature(func)
            params = {}
            for param_name, param in sig.parameters.items():
                param_type = "any"
                if param.annotation != inspect.Parameter.empty:
                    param_type = str(param.annotation.__name__ if hasattr(param.annotation, '__name__') else param.annotation)
                
                params[param_name] = {
                    "type": param_type,
                    "required": param.default == inspect.Parameter.empty,
                    "default": None if param.default == inspect.Parameter.empty else param.default
                }
            
            # Create schema
            schema = ToolSchema(
                name=tool_name,
                description=description or func.__doc__ or "",
                parameters=params,
                version=version,
                tags=tags or [],
                requires_auth=requires_auth
            )
            
            # Wrap function with logging
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                from datetime import datetime
                start = datetime.utcnow()
                try:
                    if inspect.iscoroutinefunction(func):
                        result = await func(*args, **kwargs)
                    else:
                        result = func(*args, **kwargs)
                    
                    elapsed = int((datetime.utcnow() - start).total_seconds() * 1000)
                    logger.debug(f"Tool '{tool_name}' executed in {elapsed}ms")
                    return ToolResult(success=True, data=result, execution_time_ms=elapsed)
                except Exception as e:
                    elapsed = int((datetime.utcnow() - start).total_seconds() * 1000)
                    logger.error(f"Tool '{tool_name}' failed: {e}")
                    return ToolResult(success=False, error=str(e), execution_time_ms=elapsed)
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                from datetime import datetime
                start = datetime.utcnow()
                try:
                    result = func(*args, **kwargs)
                    elapsed = int((datetime.utcnow() - start).total_seconds() * 1000)
                    logger.debug(f"Tool '{tool_name}' executed in {elapsed}ms")
                    return ToolResult(success=True, data=result, execution_time_ms=elapsed)
                except Exception as e:
                    elapsed = int((datetime.utcnow() - start).total_seconds() * 1000)
                    logger.error(f"Tool '{tool_name}' failed: {e}")
                    return ToolResult(success=False, error=str(e), execution_time_ms=elapsed)
            
            wrapper = async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper
            
            # Store in registry
            self._tools[tool_name] = {
                "fn": wrapper,
                "original_fn": func,
                "schema": schema,
                "is_async": inspect.iscoroutinefunction(func)
            }
            self._schemas[tool_name] = schema
            
            return wrapper
        return decorator
    
    def get(self, name: str) -> Optional[Callable]:
        """Get a tool by name."""
        tool = self._tools.get(name)
        return tool["fn"] if tool else None
    
    def get_schema(self, name: str) -> Optional[ToolSchema]:
        """Get tool schema by name."""
        return self._schemas.get(name)
    
    def list_tools(self, tags: List[str] = None) -> List[str]:
        """List all registered tools, optionally filtered by tags."""
        if not tags:
            return list(self._tools.keys())
        return [
            name for name, tool in self._tools.items()
            if any(tag in tool["schema"].tags for tag in tags)
        ]
    
    def get_all_schemas(self) -> Dict[str, ToolSchema]:
        """Get all tool schemas."""
        return dict(self._schemas)
    
    async def execute(self, name: str, **kwargs) -> ToolResult:
        """Execute a tool by name."""
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(success=False, error=f"Tool '{name}' not found")
        
        try:
            if tool["is_async"]:
                return await tool["fn"](**kwargs)
            else:
                return tool["fn"](**kwargs)
        except Exception as e:
            return ToolResult(success=False, error=str(e))
    
    def to_function_declarations(self) -> List[Dict]:
        """
        Convert registered tools to format suitable for LLM function calling.
        Compatible with Gemini/OpenAI function calling format.
        """
        declarations = []
        for name, tool in self._tools.items():
            schema = tool["schema"]
            
            # Convert parameters to OpenAPI-style schema
            properties = {}
            required = []
            for param_name, param_info in schema.parameters.items():
                properties[param_name] = {
                    "type": self._python_type_to_json(param_info["type"]),
                    "description": f"Parameter: {param_name}"
                }
                if param_info["required"]:
                    required.append(param_name)
            
            declarations.append({
                "name": name,
                "description": schema.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required
                }
            })
        
        return declarations
    
    def _python_type_to_json(self, py_type: str) -> str:
        """Convert Python type hints to JSON schema types."""
        type_map = {
            "str": "string",
            "int": "integer",
            "float": "number",
            "bool": "boolean",
            "list": "array",
            "dict": "object",
            "List": "array",
            "Dict": "object",
        }
        return type_map.get(py_type, "string")


# Global registry instance
registry = ToolRegistry()


# ========================================
# BUILT-IN TOOLS
# ========================================

@registry.register(
    name="web_search",
    description="Search the web for information on a topic",
    tags=["research", "trends"]
)
def web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    """Search the web using DuckDuckGo (when available)."""
    try:
        from duckduckgo_search import DDGS
        
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return {
                "query": query,
                "results": results,
                "count": len(results)
            }
    except ImportError:
        return {
            "query": query,
            "error": "Web search not available (install duckduckgo-search)",
            "results": []
        }
    except Exception as e:
        return {"query": query, "error": str(e), "results": []}


@registry.register(
    name="get_trending_topics",
    description="Get current trending topics for content creation",
    tags=["trends", "content"]
)
def get_trending_topics(category: str = "general") -> Dict[str, Any]:
    """Get trending topics based on category."""
    # This would integrate with trends API
    mock_trends = {
        "general": ["AI Agents", "Creator Economy", "Short-form Video"],
        "tech": ["Claude AI", "Gemini 2.0", "Local LLMs"],
        "business": ["Remote Work", "AI Automation", "SaaS Growth"]
    }
    
    return {
        "category": category,
        "trends": mock_trends.get(category, mock_trends["general"]),
        "source": "mock"
    }


@registry.register(
    name="analyze_text_sentiment",
    description="Analyze sentiment and tone of text content",
    tags=["content", "analysis"]
)
def analyze_text_sentiment(text: str) -> Dict[str, Any]:
    """Basic sentiment analysis."""
    # Simple keyword-based sentiment (would use ML in production)
    positive_words = ["great", "amazing", "love", "excellent", "best", "awesome", "fantastic"]
    negative_words = ["bad", "terrible", "hate", "worst", "awful", "horrible", "disappointing"]
    
    text_lower = text.lower()
    positive_count = sum(1 for w in positive_words if w in text_lower)
    negative_count = sum(1 for w in negative_words if w in text_lower)
    
    if positive_count > negative_count:
        sentiment = "positive"
        score = min(1.0, 0.5 + positive_count * 0.1)
    elif negative_count > positive_count:
        sentiment = "negative"
        score = max(0.0, 0.5 - negative_count * 0.1)
    else:
        sentiment = "neutral"
        score = 0.5
    
    return {
        "sentiment": sentiment,
        "score": score,
        "word_count": len(text.split()),
        "positive_signals": positive_count,
        "negative_signals": negative_count
    }


# Re-export existing tools from tools.py
from .tools import get_user_context, get_recent_posts, get_platform_patterns, predict_performance

# Register existing tools
registry._tools["get_user_context"] = {
    "fn": get_user_context,
    "original_fn": get_user_context,
    "schema": ToolSchema(name="get_user_context", description="Get user context and analytics summary"),
    "is_async": False
}

registry._tools["get_recent_posts"] = {
    "fn": get_recent_posts,
    "original_fn": get_recent_posts,
    "schema": ToolSchema(name="get_recent_posts", description="Get user's recent posts"),
    "is_async": False
}

registry._tools["get_platform_patterns"] = {
    "fn": get_platform_patterns,
    "original_fn": get_platform_patterns,
    "schema": ToolSchema(name="get_platform_patterns", description="Get platform-specific patterns"),
    "is_async": False
}

registry._tools["predict_performance"] = {
    "fn": predict_performance,
    "original_fn": predict_performance,
    "schema": ToolSchema(name="predict_performance", description="Predict post performance"),
    "is_async": False
}
