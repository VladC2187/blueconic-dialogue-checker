const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/run-check', async (req, res) => {
  console.log('🚀 Received trigger from N8N');

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://shop.bodyform.co.uk/?utm_content=jpard_test', { waitUntil: 'networkidle2' });

    // Accept cookies
    try {
      await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 });
      await page.click('#onetrust-accept-btn-handler');
      console.log('✅ Cookie banner accepted');
    } catch {
      console.log('❌ Cookie banner not found');
    }

    // Wait for BlueConic dialogue to potentially load
    await new Promise(resolve => setTimeout(resolve, 3000));

    let dialogueFound = false;
    let dialogueInfo = null;

    try {
      // Try normal wait
      await page.waitForSelector('.help-container', { timeout: 10000 });
      dialogueFound = true;
      console.log('✅ Dialogue found via waitForSelector');
    } catch {
      // Fallback: manually check DOM
      console.log('⚠️ Falling back to DOM check for dialogue...');
      const exists = await page.evaluate(() => {
        return document.querySelector('.help-container') !== null;
      });
      dialogueFound = exists;

      if (!dialogueFound) {
        console.log('❌ Dialogue not found in fallback either.');
      }
    }

    // Try to get dialogue metadata
    if (dialogueFound) {
      try {
        dialogueInfo = await page.evaluate(() => {
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
        console.log('✅ Dialogue info retrieved:', dialogueInfo);
      } catch (e) {
        console.log('⚠️ Failed to retrieve dialogue info:', e.message);
      }
    }

    await browser.close();

    // Respond to N8N
    res.json({
      dialogueFound,
      dialogueInfo: dialogueInfo || 'Not available'
    });

  } catch (error) {
    console.error('❌ Error running Puppeteer:', error.message);
    res.status(500).json({ error: 'Failed to run Puppeteer' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
