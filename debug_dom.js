const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // We can just inject the HTML directly!
    const fs = require('fs');
    const html = fs.readFileSync('index.html', 'utf8');
    await page.setContent(html);
    
    const parents = await page.evaluate(() => {
        let el = document.getElementById('view-split-edit');
        let path = [];
        while(el && el !== document.body) {
            path.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
            el = el.parentNode;
        }
        return path;
    });
    
    console.log("DOM Path for view-split-edit:", parents.reverse().join(' > '));
    await browser.close();
})();
