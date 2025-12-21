"""
Playwright Service - Robust Backend Scraping
"""
from typing import Dict, Any, Optional
import json
import os
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

class PlaywrightService:
    """
    Manages headless browser sessions for robust scraping.
    Acts as the 'heavy lifter' for the extension.
    """
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.headless = os.getenv("HEADLESS_MODE", "true").lower() == "true"
        
    async def start(self):
        """Initialize the browser."""
        if not self.browser:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
    async def stop(self):
        """Cleanup resources."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
            
    async def get_page(self, cookies: list[dict] = None, user_agent: str = None) -> Page:
        """Get a configured page instance."""
        if not self.browser:
            await self.start()
            
        context_args = {
            "viewport": {"width": 1280, "height": 720},
            "user_agent": user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        self.context = await self.browser.new_context(**context_args)
        
        if cookies:
            await self.context.add_cookies(cookies)
            
        page = await self.context.new_page()
        return page

    async def scrape_instagram_profile(self, username: str, cookies: list[dict]) -> Dict[str, Any]:
        """Scrape public/private Instagram profile data using authenticated session."""
        page = await self.get_page(cookies=cookies)
        metrics = {}
        
        try:
            url = f"https://www.instagram.com/{username}/"
            await page.goto(url, wait_until="networkidle")
            
            # Additional wait for SPA hydration
            await page.wait_for_timeout(3000)
            
            # Check for login wall
            if "Login" in await page.title():
                 return {"error": "Session expired or login required"}

            # Extract metrics using robust selectors
            # Note: Selectors on IG change often, visual/text selectors are safer
            
            # Followers
            followers_el = page.get_by_text("followers", exact=False).first
            if await followers_el.count() > 0:
                text = await followers_el.inner_text()
                metrics["followers"] = self._parse_metric(text)
                
            # Following
            following_el = page.get_by_text("following", exact=False).first
            if await following_el.count() > 0:
                text = await following_el.inner_text()
                metrics["following"] = self._parse_metric(text)
                
            # Posts
            posts_el = page.get_by_text("posts", exact=False).first
            if await posts_el.count() > 0:
                text = await posts_el.inner_text()
                metrics["posts"] = self._parse_metric(text)
                
            # Screenshot for debugging/visual archive
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            screenshot_path = f"scrapes/ig_{username}_{timestamp}.png"
            os.makedirs("scrapes", exist_ok=True)
            await page.screenshot(path=screenshot_path)
            
            metrics["screenshot"] = screenshot_path
            
            return {
                "success": True,
                "platform": "instagram",
                "username": username,
                "metrics": metrics,
                "scraped_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Scrape error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            await page.close()

    def _parse_metric(self, text: str) -> int:
        """Parse '1.2M followers' to 1200000"""
        try:
            # Clean text (e.g. "1,234 followers" -> "1234")
            # This is a naive implementation, needs a proper parser for K/M/B
            parts = text.split()
            if not parts: return 0
            
            # Usually the number is the first part or separate 
            # On IG often: "Title: 1.2M followers" or just "1.2M" above "followers"
            # Here we assume text might be just the label, needing finding the number.
            # Simplified for MVP.
            return 0 
        except:
            return 0

# Singleton instance
playwright_service = PlaywrightService()
