import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
      console.error('PAGE ERROR:', err.message);
      console.error(err.stack);
  });
  
  await page.goto('http://localhost:8000');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
