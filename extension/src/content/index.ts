/**
 * Content Script Entry Point
 * This file imports all platform-specific scrapers and runs them based on the current URL.
 */

// Import all scrapers
import './universal_scraper';  // Universal scraper for ALL pages
import './analytics_scraper';  // LinkedIn
import './youtube_scraper';    // YouTube Studio
import './instagram_scraper';  // Instagram
import './post_composer_detector';  // Real-time post analysis
import './screen_watcher';  // Agentic perception

console.log("Creator OS: Content scripts loaded for", window.location.hostname);
