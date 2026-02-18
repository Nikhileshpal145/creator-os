"""
Content Agent - Analyzes captions and text content for engagement potential.
Evaluates hooks, CTAs, length, and structure.
"""

from typing import Dict, Any, List
from .context import AgentContext
import re
import logging

logger = logging.getLogger(__name__)


class ContentAgent:
    """
    Analyzes text content (captions, posts) for engagement optimization.
    
    Evaluates:
    - Hook strength (first 120 chars)
    - Caption length vs platform best practices
    - Call-to-action presence
    - Hashtag usage
    - Emoji usage
    - Question presence (drives comments)
    """
    
    # Platform-specific optimal lengths
    OPTIMAL_LENGTHS = {
        "instagram": (100, 300),
        "twitter": (80, 200),
        "linkedin": (150, 400),
        "youtube": (100, 200),  # Titles/descriptions
    }
    
    # Engagement-boosting emojis
    POWER_EMOJIS = ['🔥', '🚀', '💡', '✨', '👀', '🎯', '💯', '⚡', '🙌', '❤️']
    
    async def analyze(self, ctx: AgentContext) -> Dict[str, Any]:
        """
        Analyze text content from context.
        Returns hook strength, issues, and suggestions.
        """
        
        if not ctx.has_text():
            return {
                "analyzed": False,
                "reason": "No text provided"
            }
        
        text = ctx.text
        platform = ctx.platform or "instagram"
        
        # Analyze components
        hook_analysis = self._analyze_hook(text)
        length_analysis = self._analyze_length(text, platform)
        cta_analysis = self._analyze_cta(text)
        structure_analysis = self._analyze_structure(text, platform)
        
        # Compile issues and suggestions
        issues = []
        suggestions = []
        
        # Hook issues
        if hook_analysis["strength"] == "Weak":
            issues.append("Weak hook in first line")
            suggestions.append("Start with a question, bold statement, or surprising fact")
        
        # Length issues
        if length_analysis["assessment"] == "too_short":
            issues.append("Caption too short")
            suggestions.append(f"Add more context ({length_analysis['optimal_min']}-{length_analysis['optimal_max']} chars ideal)")
        elif length_analysis["assessment"] == "too_long":
            issues.append("Caption too long for platform")
            suggestions.append("Trim to essential points or use line breaks")
        
        # CTA issues
        if not cta_analysis["has_cta"]:
            issues.append("No call-to-action")
            suggestions.append("Add CTA: 'Comment below', 'Save this', 'Share with someone'")
        
        # Structure issues
        if not structure_analysis["has_question"]:
            suggestions.append("Add a question to drive comments")
        
        if not structure_analysis["has_emojis"] and platform in ["instagram", "twitter"]:
            suggestions.append("Add emojis to increase visibility")
        
        # Calculate overall score
        score = self._calculate_score(
            hook_analysis, length_analysis, cta_analysis, structure_analysis
        )
        
        return {
            "analyzed": True,
            "score": score,
            "hook_strength": hook_analysis["strength"],
            "length_assessment": length_analysis["assessment"],
            "has_cta": cta_analysis["has_cta"],
            "issues": issues,
            "suggestions": suggestions[:4],  # Limit to top 4
            "details": {
                "char_count": len(text),
                "word_count": len(text.split()),
                "hashtag_count": structure_analysis["hashtag_count"],
                "emoji_count": structure_analysis["emoji_count"]
            }
        }
    
    def _analyze_hook(self, text: str) -> Dict[str, Any]:
        """Analyze the hook (first 120 characters)."""
        
        hook = text[:120]
        hook_lower = hook.lower()
        
        strength = "Weak"
        reasons = []
        
        # Strong hook indicators
        if '?' in hook:
            strength = "Strong"
            reasons.append("Contains question")
        
        if any(word in hook_lower for word in ['secret', 'mistake', 'truth', 'never', 'always', 'stop']):
            strength = "Strong"
            reasons.append("Uses power word")
        
        if re.match(r'^\d+\s', hook):  # Starts with number
            strength = "Strong" if strength == "Strong" else "Medium"
            reasons.append("Starts with number")
        
        if any(emoji in hook for emoji in self.POWER_EMOJIS):
            strength = "Strong" if strength == "Strong" else "Medium"
            reasons.append("Uses engaging emoji")
        
        # Weak indicators
        if hook_lower.startswith(('i ', 'my ', 'we ')):
            if strength == "Weak":
                reasons.append("Self-focused start")
        
        return {
            "strength": strength,
            "reasons": reasons,
            "hook_preview": hook[:50] + "..."
        }
    
    def _analyze_length(self, text: str, platform: str) -> Dict[str, Any]:
        """Analyze text length vs platform best practices."""
        
        length = len(text)
        optimal = self.OPTIMAL_LENGTHS.get(platform, (100, 300))
        optimal_min, optimal_max = optimal
        
        if length < optimal_min:
            assessment = "too_short"
        elif length > optimal_max:
            assessment = "too_long"
        else:
            assessment = "optimal"
        
        return {
            "length": length,
            "optimal_min": optimal_min,
            "optimal_max": optimal_max,
            "assessment": assessment
        }
    
    def _analyze_cta(self, text: str) -> Dict[str, Any]:
        """Analyze call-to-action presence."""
        
        text_lower = text.lower()
        
        cta_phrases = [
            'comment', 'share', 'like', 'follow', 'subscribe',
            'save this', 'link in bio', 'click', 'tag a friend',
            'let me know', 'drop a', 'tell me', 'dm me',
            'check out', 'grab', 'get your', 'join'
        ]
        
        has_cta = any(phrase in text_lower for phrase in cta_phrases)
        
        detected_ctas = [phrase for phrase in cta_phrases if phrase in text_lower]
        
        return {
            "has_cta": has_cta,
            "detected_ctas": detected_ctas[:3]
        }
    
    def _analyze_structure(self, text: str, platform: str) -> Dict[str, Any]:
        """Analyze structural elements."""
        
        # Count hashtags
        hashtags = re.findall(r'#\w+', text)
        hashtag_count = len(hashtags)
        
        # Count emojis (simplified)
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "]+",
            flags=re.UNICODE
        )
        emojis = emoji_pattern.findall(text)
        emoji_count = sum(len(e) for e in emojis)
        
        # Check for questions
        has_question = '?' in text
        
        # Check for line breaks (good for readability)
        has_line_breaks = '\n' in text
        
        return {
            "hashtag_count": hashtag_count,
            "emoji_count": emoji_count,
            "has_question": has_question,
            "has_line_breaks": has_line_breaks,
            "has_emojis": emoji_count > 0
        }
    
    def _calculate_score(
        self,
        hook: Dict,
        length: Dict,
        cta: Dict,
        structure: Dict
    ) -> int:
        """Calculate overall content score (0-100)."""
        
        score = 50  # Base score
        
        # Hook strength
        if hook["strength"] == "Strong":
            score += 20
        elif hook["strength"] == "Medium":
            score += 10
        
        # Length optimization
        if length["assessment"] == "optimal":
            score += 15
        elif length["assessment"] != "too_short":
            score += 5
        
        # CTA presence
        if cta["has_cta"]:
            score += 10
        
        # Structure elements
        if structure["has_question"]:
            score += 5
        if structure["has_emojis"]:
            score += 5
        if 3 <= structure["hashtag_count"] <= 10:
            score += 5
        
        return min(100, score)


# Singleton instance
content_agent = ContentAgent()
