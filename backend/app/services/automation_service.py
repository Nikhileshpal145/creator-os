"""
Automation Service - Parses natural language into browser automation commands.
Uses Gemini to understand user intent and generate executable actions.
"""
import os
import re
from typing import List, Optional
from pydantic import BaseModel
from enum import Enum

class ActionType(str, Enum):
    CLICK = "click"
    TYPE = "type"
    SCROLL = "scroll"
    NAVIGATE = "navigate"
    WAIT = "wait"
    SCREENSHOT = "screenshot"

class AutomationAction(BaseModel):
    """Single automation action."""
    id: str
    type: ActionType
    target: Optional[str] = None
    value: Optional[str] = None
    direction: Optional[str] = None
    amount: Optional[int] = None
    url: Optional[str] = None

class AutomationResult(BaseModel):
    """Result of parsing automation command."""
    success: bool
    actions: List[AutomationAction]
    requires_confirmation: bool = False
    sensitive_reason: Optional[str] = None
    raw_command: str

# Patterns for sensitive actions
SENSITIVE_PATTERNS = [
    (r'\b(login|sign in|log in)\b', 'login action'),
    (r'\b(password|passwd)\b', 'password entry'),
    (r'\b(pay|payment|checkout|purchase|buy)\b', 'payment action'),
    (r'\b(delete|remove|unsubscribe)\b', 'destructive action'),
    (r'\b(submit|confirm|agree)\b', 'confirmation action'),
]

class AutomationParser:
    """Parses natural language commands into automation actions."""
    
    def __init__(self):
        self.gemini_client = None
        self._init_gemini()
    
    def _init_gemini(self):
        """Initialize Gemini client for smart parsing."""
        try:
            import google.generativeai as genai
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                self.gemini_client = genai.GenerativeModel("gemini-2.0-flash-exp")
        except Exception as e:
            print(f"⚠️ Gemini not available for automation parsing: {e}")
    
    def parse_command(self, text: str) -> AutomationResult:
        """
        Parse natural language command into automation actions.
        
        Examples:
        - "Click the subscribe button" → [click: subscribe button]
        - "Go to YouTube Studio" → [navigate: studio.youtube.com]
        - "Scroll down and click analytics" → [scroll: down, click: analytics]
        """
        text_lower = text.lower().strip()
        
        # Check for sensitive patterns
        is_sensitive = False
        sensitive_reason = None
        for pattern, reason in SENSITIVE_PATTERNS:
            if re.search(pattern, text_lower):
                is_sensitive = True
                sensitive_reason = reason
                break
        
        actions = []
        
        # Try Gemini-powered parsing first
        if self.gemini_client:
            actions = self._parse_with_gemini(text)
        
        # Fallback to rule-based parsing
        if not actions:
            actions = self._parse_with_rules(text)
        
        return AutomationResult(
            success=len(actions) > 0,
            actions=actions,
            requires_confirmation=is_sensitive,
            sensitive_reason=sensitive_reason,
            raw_command=text
        )
    
    def _parse_with_gemini(self, text: str) -> List[AutomationAction]:
        """Use Gemini to parse complex commands."""
        try:
            prompt = f"""Parse this browser automation command into a JSON list of actions.
            
Command: "{text}"

Each action should have:
- id: unique string
- type: one of "click", "type", "scroll", "navigate", "wait"
- target: element description for click/type (optional)
- value: text to type for type action (optional)
- direction: "up" or "down" for scroll (optional)
- amount: pixels for scroll or ms for wait (optional)
- url: URL for navigate (optional)

Return ONLY valid JSON array, no explanation. Example:
[{{"id": "1", "type": "click", "target": "subscribe button"}}]

If the command cannot be parsed, return: []
"""
            
            response = self.gemini_client.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response
            import json
            
            # Clean up response
            if response_text.startswith("```"):
                response_text = re.sub(r'^```\w*\n?', '', response_text)
                response_text = re.sub(r'\n?```$', '', response_text)
            
            actions_data = json.loads(response_text)
            
            actions = []
            for i, action_data in enumerate(actions_data):
                action = AutomationAction(
                    id=action_data.get('id', str(i + 1)),
                    type=ActionType(action_data.get('type', 'click')),
                    target=action_data.get('target'),
                    value=action_data.get('value'),
                    direction=action_data.get('direction'),
                    amount=action_data.get('amount'),
                    url=action_data.get('url')
                )
                actions.append(action)
            
            return actions
            
        except Exception as e:
            print(f"Gemini parsing error: {e}")
            return []
    
    def _parse_with_rules(self, text: str) -> List[AutomationAction]:
        """Rule-based fallback parser."""
        text_lower = text.lower()
        actions = []
        action_id = 1
        
        # Navigation patterns
        nav_patterns = [
            (r'go to (\S+)', 'navigate'),
            (r'open (\S+)', 'navigate'),
            (r'visit (\S+)', 'navigate'),
            (r'navigate to (\S+)', 'navigate'),
        ]
        
        for pattern, action_type in nav_patterns:
            match = re.search(pattern, text_lower)
            if match:
                url = match.group(1)
                # Add https if needed
                if not url.startswith('http'):
                    url = f'https://{url}'
                actions.append(AutomationAction(
                    id=str(action_id),
                    type=ActionType.NAVIGATE,
                    url=url
                ))
                action_id += 1
        
        # Click patterns
        click_patterns = [
            r'click (?:on )?(?:the )?(.+?)(?:\s+and|\s*$)',
            r'press (?:the )?(.+?)(?:\s+and|\s*$)',
            r'tap (?:on )?(?:the )?(.+?)(?:\s+and|\s*$)',
        ]
        
        for pattern in click_patterns:
            match = re.search(pattern, text_lower)
            if match:
                target = match.group(1).strip()
                actions.append(AutomationAction(
                    id=str(action_id),
                    type=ActionType.CLICK,
                    target=target
                ))
                action_id += 1
        
        # Scroll patterns
        if 'scroll down' in text_lower:
            actions.append(AutomationAction(
                id=str(action_id),
                type=ActionType.SCROLL,
                direction='down',
                amount=500
            ))
            action_id += 1
        elif 'scroll up' in text_lower:
            actions.append(AutomationAction(
                id=str(action_id),
                type=ActionType.SCROLL,
                direction='up',
                amount=500
            ))
            action_id += 1
        
        # Type patterns
        type_match = re.search(r'type ["\'](.+?)["\']', text_lower)
        if type_match:
            actions.append(AutomationAction(
                id=str(action_id),
                type=ActionType.TYPE,
                target='input',
                value=type_match.group(1)
            ))
            action_id += 1
        
        # Wait pattern
        wait_match = re.search(r'wait (\d+) ?(seconds?|s|ms)?', text_lower)
        if wait_match:
            amount = int(wait_match.group(1))
            unit = wait_match.group(2) or 's'
            if 'ms' not in unit:
                amount *= 1000
            actions.append(AutomationAction(
                id=str(action_id),
                type=ActionType.WAIT,
                amount=amount
            ))
            action_id += 1
        
        return actions


# Singleton instance
automation_parser = AutomationParser()
