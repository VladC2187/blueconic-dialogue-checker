const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.goto('https://shop.bodyform.co.uk/?utm_content=jpard_test', { waitUntil: 'networkidle2' });

  // Accept the cookies
  try {
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 });
    await page.click('#onetrust-accept-btn-handler');
    console.log('Cookie banner accepted');
  } catch {
    console.log('Cookie banner not found');
  }

  // Wait a bit after accepting cookies to let BlueConic load the dialogue
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Optional: screenshot
  await page.screenshot({ path: 'after-cookie.png' });

  // Check for dialogue
  let dialogueFound = false;
  try {
    await page.waitForSelector('.help-container', { timeout: 8000 });
    dialogueFound = true;
    console.log('Dialogue FOUND!');

    // Try to get dialogue info from BlueConic
    const dialogueInfo = await page.evaluate(() => {
      try {
        const interactions = window.blueConicClient?.getInteractions?.();
        if (interactions && interactions.length > 0) {
          const variantId = interactions[0].id;
          return window.blueConicClient.getInteractionNamesById(variantId);
        }
      } catch (e) {
        return null;
      }
      return null;
    });

    if (dialogueInfo) {
      console.log('Dialogue Info:', dialogueInfo);
    } else {
      console.log('Dialogue info could not be retrieved.');
    }

  } catch {
    console.log('Dialogue NOT found.');
  }

  await browser.close();
})();
