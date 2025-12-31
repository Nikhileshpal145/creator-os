"""
Agent Chain - Sequential multi-step reasoning with chained agents.
Enables complex workflows where each agent's output feeds the next.
"""

from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass, field
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ChainStep:
    """A single step in an agent chain."""
    name: str
    agent_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]
    required: bool = True
    timeout_seconds: float = 30.0
    retry_count: int = 1
    transform_output: Optional[Callable[[Dict], Dict]] = None


@dataclass
class ChainResult:
    """Result from running a chain."""
    success: bool
    final_output: Dict[str, Any]
    step_results: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    execution_time_ms: int = 0


class AgentChain:
    """
    Sequential agent chaining system.
    
    Example:
        chain = AgentChain()
        chain.add_step("vision", vision_agent.analyze)
        chain.add_step("content", content_agent.analyze)
        chain.add_step("strategy", strategy_agent.decide)
        result = await chain.run(context)
    """
    
    def __init__(self, name: str = "default"):
        self.name = name
        self.steps: List[ChainStep] = []
        self.shared_context: Dict[str, Any] = {}
    
    def add_step(
        self,
        name: str,
        agent_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
        required: bool = True,
        timeout_seconds: float = 30.0,
        retry_count: int = 1,
        transform_output: Optional[Callable[[Dict], Dict]] = None
    ) -> "AgentChain":
        """Add a step to the chain. Returns self for method chaining."""
        self.steps.append(ChainStep(
            name=name,
            agent_fn=agent_fn,
            required=required,
            timeout_seconds=timeout_seconds,
            retry_count=retry_count,
            transform_output=transform_output
        ))
        return self
    
    async def run(
        self,
        initial_context: Dict[str, Any],
        stop_on_error: bool = True
    ) -> ChainResult:
        """
        Run all steps in sequence.
        
        Each step receives the accumulated context from previous steps.
        """
        start_time = datetime.utcnow()
        
        result = ChainResult(
            success=True,
            final_output={},
            step_results=[],
            errors=[]
        )
        
        # Initialize context with input
        context = {**initial_context}
        self.shared_context = context
        
        for step in self.steps:
            step_result = await self._execute_step(step, context)
            result.step_results.append({
                "step": step.name,
                "success": step_result.get("success", True),
                "output": step_result
            })
            
            if not step_result.get("success", True):
                error_msg = f"Step '{step.name}' failed: {step_result.get('error', 'Unknown error')}"
                result.errors.append(error_msg)
                
                if step.required and stop_on_error:
                    result.success = False
                    break
            else:
                # Merge step output into context for next step
                output = step_result.get("output", step_result)
                if step.transform_output:
                    output = step.transform_output(output)
                
                context[step.name] = output
                context["_last_step"] = step.name
                context["_last_output"] = output
        
        result.final_output = context
        result.execution_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return result
    
    async def _execute_step(
        self,
        step: ChainStep,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single step with timeout and retry logic."""
        
        last_error = None
        
        for attempt in range(step.retry_count):
            try:
                # Execute with timeout
                result = await asyncio.wait_for(
                    step.agent_fn(context),
                    timeout=step.timeout_seconds
                )
                return {"success": True, "output": result}
                
            except asyncio.TimeoutError:
                last_error = f"Timeout after {step.timeout_seconds}s"
                logger.warning(f"Step {step.name} timed out (attempt {attempt + 1})")
                
            except Exception as e:
                last_error = str(e)
                logger.error(f"Step {step.name} error (attempt {attempt + 1}): {e}")
        
        return {"success": False, "error": last_error}


class AgentRouter:
    """
    Routes queries to specialized agents based on intent detection.
    
    Example:
        router = AgentRouter()
        router.register("analytics", analytics_agent.process, ["stats", "metrics", "performance"])
        router.register("content", content_agent.process, ["post", "caption", "write"])
        result = await router.route("How are my stats looking?", context)
    """
    
    def __init__(self):
        self.routes: Dict[str, Dict[str, Any]] = {}
        self.default_agent: Optional[Callable] = None
    
    def register(
        self,
        name: str,
        agent_fn: Callable[[str, Dict], Awaitable[Dict]],
        keywords: List[str],
        priority: int = 0
    ) -> "AgentRouter":
        """Register an agent with routing keywords."""
        self.routes[name] = {
            "fn": agent_fn,
            "keywords": [k.lower() for k in keywords],
            "priority": priority
        }
        return self
    
    def set_default(self, agent_fn: Callable[[str, Dict], Awaitable[Dict]]) -> "AgentRouter":
        """Set the default agent for unmatched queries."""
        self.default_agent = agent_fn
        return self
    
    def detect_intent(self, query: str) -> str:
        """Detect which agent should handle the query."""
        query_lower = query.lower()
        
        matches = []
        for name, route in self.routes.items():
            score = sum(1 for kw in route["keywords"] if kw in query_lower)
            if score > 0:
                matches.append((name, score, route["priority"]))
        
        if matches:
            # Sort by score (desc), then priority (desc)
            matches.sort(key=lambda x: (x[1], x[2]), reverse=True)
            return matches[0][0]
        
        return "default"
    
    async def route(
        self,
        query: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Route query to appropriate agent."""
        
        intent = self.detect_intent(query)
        
        if intent == "default" and self.default_agent:
            return await self.default_agent(query, context)
        
        if intent in self.routes:
            agent_fn = self.routes[intent]["fn"]
            return await agent_fn(query, context)
        
        return {
            "success": False,
            "error": "No matching agent found",
            "detected_intent": intent
        }


class ParallelAgentExecutor:
    """
    Execute multiple agents in parallel and combine results.
    
    Useful when multiple independent analyses are needed.
    """
    
    def __init__(self):
        self.agents: List[Dict[str, Any]] = []
    
    def add(
        self,
        name: str,
        agent_fn: Callable[[Dict], Awaitable[Dict]],
        weight: float = 1.0
    ) -> "ParallelAgentExecutor":
        """Add an agent to run in parallel."""
        self.agents.append({
            "name": name,
            "fn": agent_fn,
            "weight": weight
        })
        return self
    
    async def run(
        self,
        context: Dict[str, Any],
        timeout_seconds: float = 30.0
    ) -> Dict[str, Any]:
        """Run all agents in parallel."""
        
        async def execute_agent(agent: Dict) -> Dict[str, Any]:
            try:
                result = await agent["fn"](context)
                return {
                    "name": agent["name"],
                    "success": True,
                    "result": result,
                    "weight": agent["weight"]
                }
            except Exception as e:
                return {
                    "name": agent["name"],
                    "success": False,
                    "error": str(e),
                    "weight": agent["weight"]
                }
        
        # Execute all in parallel with timeout
        tasks = [execute_agent(agent) for agent in self.agents]
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=timeout_seconds
        )
        
        # Combine results
        agent_results = {}
        errors = []
        
        for r in results:
            if isinstance(r, Exception):
                errors.append(str(r))
            elif r.get("success"):
                agent_results[r["name"]] = r["result"]
            else:
                errors.append(f"{r['name']}: {r.get('error', 'Unknown error')}")
        
        return {
            "success": len(errors) == 0,
            "results": agent_results,
            "errors": errors,
            "agents_run": len(self.agents),
            "agents_succeeded": len(agent_results)
        }
