/**
 * Content Script Entry Point
 * This file imports all platform-specific scrapers and runs them based on the current URL.
 */

// Import all scrapers
import './analytics_scraper';  // LinkedIn
import './youtube_scraper';    // YouTube Studio
import './instagram_scraper';  // Instagram

console.log("Creator OS: Content scripts loaded for", window.location.hostname);
