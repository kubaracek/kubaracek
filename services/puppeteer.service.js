const puppeteer = require('puppeteer');
class PuppeteerService {
  browser;
  page;

  async init() {
    this.browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--incognito',
      ],
      // headless: false,
    });
  }

  /**
   *
   * @param {string} url
   */
  async goToPage(url) {
    if (!this.browser) {
      await this.init();
    }
    this.page = await this.browser.newPage();

    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US',
    });

    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * Get the latest Instagram posts from an account using Imginn
   * @param {string} acc Instagram account to crawl
   * @param {number} n Number of posts to fetch
   * @returns {Promise<string[]>} Array of image URLs
   */
  async getLatestInstagramPostsFromAccount(acc, n = 3) {
    try {
      // Use Imginn as a third-party Instagram viewer
      const page = `https://imginn.com/${acc}/`;
      await this.goToPage(page);

      // Wait for images to load - using a general image selector for Imginn
      await this.page.waitForSelector('.item img', { timeout: 10000 });

      // Scroll to ensure more posts are loaded if needed
      let postImages = [];
      let previousCount = 0;
      const maxScrolls = 3; // Limit scrolling attempts
      let scrollAttempts = 0;

      while (postImages.length < n && scrollAttempts < maxScrolls) {
        // Get currently loaded images
        postImages = await this.page.evaluate(() => {
          // Target the post images on Imginn
          const images = document.querySelectorAll('.item img');
          return Array.from(images)
              .filter(img => img.src && !img.src.includes('blank.gif')) // Filter out placeholder images
              .map(img => img.src);
        });

        // If we already have enough images or no new images loaded after scroll
        if (postImages.length >= n || postImages.length === previousCount) {
          break;
        }

        previousCount = postImages.length;

        // Scroll down to load more images
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for potential new images to load
        await this.page.waitForTimeout(1500);
        scrollAttempts++;
      }

      console.log(`Retrieved ${postImages.length} Instagram posts from ${acc} via Imginn`);

      console.log(postImages);

      // Return only the requested number of images
      return postImages.slice(0, n);
    } catch (error) {
      console.error('Error fetching Instagram posts via Imginn:', error);
      // Return empty array instead of exiting process
      return [];
    }
  }
}

const puppeteerService = new PuppeteerService();

module.exports = puppeteerService;
