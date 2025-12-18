from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.models.content import ContentDraft, ContentPerformance
from app.models.content_pattern import ContentPattern, PatternRecommendation
import re
from collections import defaultdict
import statistics


class IntelligenceService:
    """
    Core Intelligence Layer for pattern detection, multi-platform learning,
    and causal explanation generation.
    """
    
    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self.analysis_window_days = 60
    
    def get_user_content_with_performance(self) -> List[Dict[str, Any]]:
        """Fetch all user content with their latest performance metrics."""
        statement = select(ContentDraft).where(ContentDraft.user_id == self.user_id)
        drafts = self.db.exec(statement).all()
        
        results = []
        for draft in drafts:
            perf_stmt = select(ContentPerformance).where(
                ContentPerformance.draft_id == draft.id
            ).order_by(ContentPerformance.recorded_at.desc())
            latest_perf = self.db.exec(perf_stmt).first()
            
            if latest_perf:
                results.append({
                    "draft": draft,
                    "performance": latest_perf,
                    "engagement": latest_perf.likes + latest_perf.comments + latest_perf.shares,
                    "platform": draft.platform,
                    "text": draft.text_content,
                    "created_at": draft.created_at
                })
        
        return results
    
    # ========================================
    # PATTERN DETECTION ALGORITHMS
    # ========================================
    
    def detect_content_type_patterns(self, content_data: List[Dict]) -> List[ContentPattern]:
        """
        Detect patterns based on content type:
        - Text with faces (detected via AI analysis)
        - Video/Reels
        - Carousels
        - Text-only
        - With images vs without
        """
        patterns = []
        
        # Group by content characteristics
        content_groups = defaultdict(list)
        
        for item in content_data:
            ai_analysis = item["draft"].ai_analysis or {}
            
            # Detect content type from AI analysis or text patterns
            content_type = "text_only"
            if ai_analysis.get("visual_score"):
                content_type = "with_visual"
                if ai_analysis.get("feedback") and any("face" in str(f).lower() for f in ai_analysis.get("feedback", [])):
                    content_type = "with_face"
            
            content_groups[content_type].append(item["engagement"])
        
        # Calculate performance multipliers
        all_engagements = [item["engagement"] for item in content_data]
        if not all_engagements:
            return patterns
            
        overall_avg = statistics.mean(all_engagements) if all_engagements else 1
        
        for content_type, engagements in content_groups.items():
            if len(engagements) >= 2:  # Need at least 2 samples
                avg_engagement = statistics.mean(engagements)
                multiplier = round(avg_engagement / max(overall_avg, 1), 2)
                
                if multiplier > 1.2 or multiplier < 0.8:  # Only significant patterns
                    pattern = ContentPattern(
                        user_id=self.user_id,
                        pattern_type="content_type",
                        platform="all",
                        pattern_data={
                            "type": content_type,
                            "avg_engagement": round(avg_engagement, 1),
                            "overall_avg": round(overall_avg, 1)
                        },
                        confidence_score=min(len(engagements) / 10, 1.0),
                        sample_size=len(engagements),
                        analysis_window_days=self.analysis_window_days,
                        performance_multiplier=multiplier,
                        explanation=self._generate_content_type_explanation(content_type, multiplier)
                    )
                    patterns.append(pattern)
        
        return patterns
    
    def detect_posting_time_patterns(self, content_data: List[Dict]) -> List[ContentPattern]:
        """
        Detect optimal posting times:
        - Hour of day patterns
        - Day of week patterns
        """
        patterns = []
        
        # Group by hour
        hour_performance = defaultdict(list)
        day_performance = defaultdict(list)
        
        for item in content_data:
            created_at = item["created_at"]
            if created_at:
                hour = created_at.hour
                day = created_at.strftime("%A").lower()
                
                hour_performance[hour].append(item["engagement"])
                day_performance[day].append(item["engagement"])
        
        # Find best hours
        hour_avgs = {hour: statistics.mean(engs) for hour, engs in hour_performance.items() if len(engs) >= 2}
        
        if hour_avgs:
            overall_avg = statistics.mean([e for item in content_data for e in [item["engagement"]]])
            best_hours = sorted(hour_avgs.items(), key=lambda x: x[1], reverse=True)[:3]
            
            if best_hours:
                top_hour, top_avg = best_hours[0]
                multiplier = round(top_avg / max(overall_avg, 1), 2)
                
                if multiplier > 1.2:
                    pattern = ContentPattern(
                        user_id=self.user_id,
                        pattern_type="posting_time",
                        platform="all",
                        pattern_data={
                            "optimal_hours": [h for h, _ in best_hours],
                            "hour_performance": {str(h): round(a, 1) for h, a in hour_avgs.items()},
                            "best_hour_range": f"{top_hour}:00-{top_hour+1}:00"
                        },
                        confidence_score=min(sum(len(v) for v in hour_performance.values()) / 20, 1.0),
                        sample_size=len(content_data),
                        analysis_window_days=self.analysis_window_days,
                        performance_multiplier=multiplier,
                        explanation=f"Posts between {top_hour}:00-{top_hour+1}:00 perform {multiplier}× better"
                    )
                    patterns.append(pattern)
        
        # Find best days
        day_avgs = {day: statistics.mean(engs) for day, engs in day_performance.items() if len(engs) >= 2}
        
        if day_avgs:
            overall_avg = statistics.mean([e for item in content_data for e in [item["engagement"]]])
            best_days = sorted(day_avgs.items(), key=lambda x: x[1], reverse=True)[:2]
            
            if best_days:
                top_day, top_avg = best_days[0]
                multiplier = round(top_avg / max(overall_avg, 1), 2)
                
                if multiplier > 1.2:
                    pattern = ContentPattern(
                        user_id=self.user_id,
                        pattern_type="posting_day",
                        platform="all",
                        pattern_data={
                            "optimal_days": [d for d, _ in best_days],
                            "day_performance": {d: round(a, 1) for d, a in day_avgs.items()}
                        },
                        confidence_score=min(sum(len(v) for v in day_performance.values()) / 15, 1.0),
                        sample_size=len(content_data),
                        analysis_window_days=self.analysis_window_days,
                        performance_multiplier=multiplier,
                        explanation=f"{top_day.capitalize()}s perform {multiplier}× better than average"
                    )
                    patterns.append(pattern)
        
        return patterns
    
    def detect_caption_patterns(self, content_data: List[Dict]) -> List[ContentPattern]:
        """
        Detect caption structure patterns:
        - Short vs long captions
        - Emoji usage
        - Hashtag usage
        - Question-based captions
        """
        patterns = []
        
        caption_groups = defaultdict(list)
        
        for item in content_data:
            text = item["text"] or ""
            text_len = len(text)
            
            # Classify caption length
            if text_len <= 100:
                length_class = "short"
            elif text_len <= 280:
                length_class = "medium"
            else:
                length_class = "long"
            
            # Check for patterns
            has_emoji = bool(re.search(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]', text))
            has_hashtags = '#' in text
            has_question = '?' in text
            
            caption_groups[f"length_{length_class}"].append(item["engagement"])
            if has_emoji:
                caption_groups["with_emoji"].append(item["engagement"])
            else:
                caption_groups["no_emoji"].append(item["engagement"])
            if has_question:
                caption_groups["with_question"].append(item["engagement"])
        
        # Analyze each group
        all_engagements = [item["engagement"] for item in content_data]
        if not all_engagements:
            return patterns
            
        overall_avg = statistics.mean(all_engagements)
        
        for group_name, engagements in caption_groups.items():
            if len(engagements) >= 2:
                avg_engagement = statistics.mean(engagements)
                multiplier = round(avg_engagement / max(overall_avg, 1), 2)
                
                if multiplier > 1.3 or multiplier < 0.7:
                    pattern = ContentPattern(
                        user_id=self.user_id,
                        pattern_type="caption_structure",
                        platform="all",
                        pattern_data={
                            "style": group_name,
                            "avg_engagement": round(avg_engagement, 1),
                            "sample_size": len(engagements)
                        },
                        confidence_score=min(len(engagements) / 8, 1.0),
                        sample_size=len(engagements),
                        analysis_window_days=self.analysis_window_days,
                        performance_multiplier=multiplier,
                        explanation=self._generate_caption_explanation(group_name, multiplier)
                    )
                    patterns.append(pattern)
        
        return patterns
    
    def detect_velocity_patterns(self, content_data: List[Dict]) -> List[ContentPattern]:
        """
        Detect engagement velocity patterns:
        - Correlation between first-hour engagement and total engagement
        - Fast vs slow burn content
        """
        # This requires time-series performance data which we may not have granular enough
        # For now, return mock pattern based on available data
        
        if len(content_data) < 5:
            return []
        
        # Analyze spread of engagement
        engagements = [item["engagement"] for item in content_data]
        if not engagements:
            return []
            
        avg_eng = statistics.mean(engagements)
        std_dev = statistics.stdev(engagements) if len(engagements) > 1 else 0
        
        # High variance suggests some content "goes viral" while others don't
        if std_dev > avg_eng * 0.5:  # High variance
            pattern = ContentPattern(
                user_id=self.user_id,
                pattern_type="engagement_velocity",
                platform="all",
                pattern_data={
                    "pattern": "high_variance",
                    "avg_engagement": round(avg_eng, 1),
                    "std_dev": round(std_dev, 1),
                    "top_performer_threshold": round(avg_eng + std_dev, 1)
                },
                confidence_score=min(len(engagements) / 10, 1.0),
                sample_size=len(engagements),
                analysis_window_days=self.analysis_window_days,
                performance_multiplier=round((avg_eng + std_dev) / max(avg_eng, 1), 2),
                explanation="Your top-performing posts get significantly higher engagement than average - focus on replicating those patterns"
            )
            return [pattern]
        
        return []
    
    def detect_platform_patterns(self, content_data: List[Dict]) -> List[ContentPattern]:
        """
        Detect cross-platform patterns:
        - Which platform performs best
        - Platform-specific content that works
        """
        patterns = []
        
        platform_performance = defaultdict(list)
        
        for item in content_data:
            platform_performance[item["platform"]].append(item["engagement"])
        
        if len(platform_performance) < 2:
            return patterns
        
        all_engagements = [item["engagement"] for item in content_data]
        if not all_engagements:
            return patterns
            
        overall_avg = statistics.mean(all_engagements)
        
        platform_avgs = {}
        for platform, engagements in platform_performance.items():
            if len(engagements) >= 2:
                platform_avgs[platform] = statistics.mean(engagements)
        
        if platform_avgs:
            best_platform = max(platform_avgs.items(), key=lambda x: x[1])
            multiplier = round(best_platform[1] / max(overall_avg, 1), 2)
            
            pattern = ContentPattern(
                user_id=self.user_id,
                pattern_type="platform_performance",
                platform=best_platform[0],
                pattern_data={
                    "platform_comparison": {p: round(a, 1) for p, a in platform_avgs.items()},
                    "best_platform": best_platform[0],
                    "best_avg": round(best_platform[1], 1)
                },
                confidence_score=min(len(content_data) / 15, 1.0),
                sample_size=len(content_data),
                analysis_window_days=self.analysis_window_days,
                performance_multiplier=multiplier,
                explanation=f"{best_platform[0].capitalize()} is your best-performing platform with {multiplier}× average engagement"
            )
            patterns.append(pattern)
        
        return patterns
    
    # ========================================
    # MAIN ANALYSIS METHOD
    # ========================================
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """
        Run all pattern detection algorithms and store results.
        Returns a summary of detected patterns.
        """
        content_data = self.get_user_content_with_performance()
        
        if not content_data:
            return {
                "status": "insufficient_data",
                "message": "Not enough content data for pattern analysis. Keep posting!",
                "patterns": [],
                "recommendations": []
            }
        
        all_patterns = []
        
        # Run all detectors
        all_patterns.extend(self.detect_content_type_patterns(content_data))
        all_patterns.extend(self.detect_posting_time_patterns(content_data))
        all_patterns.extend(self.detect_caption_patterns(content_data))
        all_patterns.extend(self.detect_velocity_patterns(content_data))
        all_patterns.extend(self.detect_platform_patterns(content_data))
        
        # Store patterns in database (update existing or create new)
        stored_patterns = []
        for pattern in all_patterns:
            # Check if pattern already exists
            existing = self.db.exec(
                select(ContentPattern).where(
                    ContentPattern.user_id == self.user_id,
                    ContentPattern.pattern_type == pattern.pattern_type,
                    ContentPattern.platform == pattern.platform
                )
            ).first()
            
            if existing:
                # Update existing pattern
                existing.pattern_data = pattern.pattern_data
                existing.confidence_score = pattern.confidence_score
                existing.sample_size = pattern.sample_size
                existing.performance_multiplier = pattern.performance_multiplier
                existing.explanation = pattern.explanation
                existing.updated_at = datetime.utcnow()
                stored_patterns.append(existing)
            else:
                # Create new pattern
                self.db.add(pattern)
                stored_patterns.append(pattern)
        
        self.db.commit()
        
        # Generate recommendations
        recommendations = self._generate_recommendations(stored_patterns)
        
        return {
            "status": "success",
            "patterns_detected": len(stored_patterns),
            "patterns": [self._pattern_to_dict(p) for p in stored_patterns],
            "recommendations": recommendations,
            "analysis_window_days": self.analysis_window_days,
            "content_analyzed": len(content_data)
        }
    
    def get_patterns(self) -> List[Dict]:
        """Get all stored patterns for the user."""
        statement = select(ContentPattern).where(
            ContentPattern.user_id == self.user_id
        ).order_by(ContentPattern.performance_multiplier.desc())
        
        patterns = self.db.exec(statement).all()
        return [self._pattern_to_dict(p) for p in patterns]
    
    def get_recommendations(self) -> List[Dict]:
        """Get actionable recommendations based on patterns."""
        patterns = self.get_patterns()
        return self._generate_recommendations(patterns)
    
    # ========================================
    # HELPER METHODS
    # ========================================
    
    def _generate_content_type_explanation(self, content_type: str, multiplier: float) -> str:
        type_descriptions = {
            "with_face": "Content with faces visible",
            "with_visual": "Posts with images/visuals",
            "text_only": "Text-only posts"
        }
        desc = type_descriptions.get(content_type, content_type.replace("_", " ").title())
        
        if multiplier > 1:
            return f"{desc} perform {multiplier}× better than your average content"
        else:
            return f"{desc} underperform at {multiplier}× compared to average"
    
    def _generate_caption_explanation(self, group_name: str, multiplier: float) -> str:
        explanations = {
            "length_short": "Short captions (under 100 chars)",
            "length_medium": "Medium captions (100-280 chars)",
            "length_long": "Longer captions (280+ chars)",
            "with_emoji": "Posts with emojis",
            "no_emoji": "Posts without emojis",
            "with_question": "Posts asking questions"
        }
        desc = explanations.get(group_name, group_name.replace("_", " ").title())
        
        if multiplier > 1:
            return f"{desc} drive {multiplier}× more engagement"
        else:
            return f"{desc} get {multiplier}× engagement (below average)"
    
    def _generate_recommendations(self, patterns: List) -> List[Dict]:
        """Generate actionable recommendations from patterns."""
        recommendations = []
        
        for pattern in patterns:
            pattern_dict = pattern if isinstance(pattern, dict) else self._pattern_to_dict(pattern)
            
            if pattern_dict["performance_multiplier"] > 1.5:
                rec = {
                    "title": f"Double Down on What Works",
                    "description": pattern_dict["explanation"],
                    "priority": 1,
                    "category": pattern_dict["pattern_type"],
                    "expected_impact": f"+{int((pattern_dict['performance_multiplier'] - 1) * 100)}% engagement"
                }
                recommendations.append(rec)
            elif pattern_dict["performance_multiplier"] < 0.7:
                rec = {
                    "title": "Avoid This Pattern",
                    "description": f"Consider reducing: {pattern_dict['explanation']}",
                    "priority": 2,
                    "category": pattern_dict["pattern_type"],
                    "expected_impact": "Improve baseline engagement"
                }
                recommendations.append(rec)
        
        # Sort by priority
        recommendations.sort(key=lambda x: x["priority"])
        
        return recommendations[:5]  # Top 5 recommendations
    
    def _pattern_to_dict(self, pattern) -> Dict:
        """Convert ContentPattern to dictionary."""
        if isinstance(pattern, dict):
            return pattern
            
        return {
            "id": str(pattern.id),
            "pattern_type": pattern.pattern_type,
            "platform": pattern.platform,
            "pattern_data": pattern.pattern_data,
            "confidence_score": pattern.confidence_score,
            "sample_size": pattern.sample_size,
            "performance_multiplier": pattern.performance_multiplier,
            "explanation": pattern.explanation,
            "analysis_window_days": pattern.analysis_window_days
        }


# ========================================
# MOCK DATA SERVICE (for testing without DB)
# ========================================

class MockIntelligenceService:
    """
    Provides mock intelligence data for testing and demos.
    """
    
    @staticmethod
    def get_mock_patterns(user_id: str) -> List[Dict]:
        """Return realistic mock patterns."""
        return [
            {
                "id": "mock-1",
                "pattern_type": "content_type",
                "platform": "instagram",
                "pattern_data": {
                    "type": "reel_with_face",
                    "avg_engagement": 450,
                    "overall_avg": 195
                },
                "confidence_score": 0.87,
                "sample_size": 24,
                "performance_multiplier": 2.3,
                "explanation": "Reels with faces + short captions posted between 8–9 PM performed 2.3× better over 60 days",
                "analysis_window_days": 60
            },
            {
                "id": "mock-2",
                "pattern_type": "posting_time",
                "platform": "all",
                "pattern_data": {
                    "optimal_hours": [20, 21],
                    "best_hour_range": "20:00-21:00"
                },
                "confidence_score": 0.92,
                "sample_size": 45,
                "performance_multiplier": 1.8,
                "explanation": "Posts between 8–9 PM consistently outperform other times by 1.8×",
                "analysis_window_days": 60
            },
            {
                "id": "mock-3",
                "pattern_type": "caption_structure",
                "platform": "linkedin",
                "pattern_data": {
                    "style": "with_question",
                    "avg_engagement": 320,
                    "sample_size": 18
                },
                "confidence_score": 0.75,
                "sample_size": 18,
                "performance_multiplier": 1.6,
                "explanation": "LinkedIn posts with questions get 1.6× more comments",
                "analysis_window_days": 60
            },
            {
                "id": "mock-4",
                "pattern_type": "platform_performance",
                "platform": "twitter",
                "pattern_data": {
                    "platform_comparison": {
                        "twitter": 285,
                        "linkedin": 210,
                        "instagram": 195
                    },
                    "best_platform": "twitter"
                },
                "confidence_score": 0.88,
                "sample_size": 67,
                "performance_multiplier": 1.4,
                "explanation": "Twitter is your best-performing platform with 1.4× average engagement",
                "analysis_window_days": 60
            },
            {
                "id": "mock-5",
                "pattern_type": "caption_structure",
                "platform": "all",
                "pattern_data": {
                    "style": "length_short",
                    "max_chars": 100
                },
                "confidence_score": 0.68,
                "sample_size": 32,
                "performance_multiplier": 1.35,
                "explanation": "Short captions (under 100 chars) drive 1.35× more engagement",
                "analysis_window_days": 60
            }
        ]
    
    @staticmethod
    def get_mock_recommendations(user_id: str) -> List[Dict]:
        """Return mock recommendations."""
        return [
            {
                "title": "Post More Reels with Faces",
                "description": "Your Reels showing faces perform 2.3× better. Try to include yourself or others in more content.",
                "priority": 1,
                "category": "content_type",
                "expected_impact": "+130% engagement"
            },
            {
                "title": "Optimize Your Posting Schedule",
                "description": "Schedule posts between 8–9 PM for maximum reach. This time slot consistently outperforms.",
                "priority": 1,
                "category": "posting_time",
                "expected_impact": "+80% engagement"
            },
            {
                "title": "Ask More Questions on LinkedIn",
                "description": "Posts with questions drive significantly more comments. End with a thought-provoking question.",
                "priority": 2,
                "category": "caption_structure",
                "expected_impact": "+60% comments"
            },
            {
                "title": "Focus on Twitter",
                "description": "Your Twitter content resonates most with your audience. Consider cross-posting your best LinkedIn content there.",
                "priority": 2,
                "category": "platform_performance",
                "expected_impact": "+40% overall reach"
            },
            {
                "title": "Keep Captions Concise",
                "description": "Shorter captions perform better. Try to keep hooks under 100 characters.",
                "priority": 3,
                "category": "caption_structure",
                "expected_impact": "+35% engagement"
            }
        ]
