const puppeteer = require('puppeteer');

async function checkComment(postUrl, username) {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(postUrl, { waitUntil: 'networkidle2' });

    let isFound = false;
    if (postUrl.includes('tiktok.com')) {
      // TikTok scraping logic with scrolling
      await page.waitForSelector('body'); // Wait for the body to be present

      // Scroll down to load comments
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for comments to load
      }

      // Now, try to find the comments
      try {
        await page.waitForSelector('[data-e2e="comment-username"]', { timeout: 10000 });
        const comments = await page.$eval('[data-e2e="comment-username"]', elements => elements.map(el => el.textContent.trim()));
        isFound = comments.some(commentUsername => commentUsername === username);
      } catch (e) {
        // It's possible no comments were found with that username.
        // Or the selector failed. In either case, we can say the user was not found.
        isFound = false;
      }

    } else if (postUrl.includes('instagram.com')) {
      // Instagram scraping logic
      // Note: Instagram's comment section loads on scroll.
      // This selector is a best guess and might need adjustment.
      await page.waitForSelector('div[class*="Comments"] ul li div[class*="Comment"] a[href*="/"]', { timeout: 60000 });
      const comments = await page.$$eval('div[class*="Comments"] ul li div[class*="Comment"] a[href*="/"]', elements => elements.map(el => el.textContent.trim()));
      isFound = comments.some(commentUsername => commentUsername === username);
    } else {
      throw new Error('Unsupported URL. Please provide a TikTok or Instagram Reels link.');
    }

    return { postUrl, username, found: isFound };
  } catch (error) {
    console.error('Error during scraping:', error);
    throw new Error('Failed to scrape the comment section. The page structure might have changed.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { checkComment };
