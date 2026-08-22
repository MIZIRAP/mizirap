const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const html = fs.readFileSync('index.html', 'utf8');
    await page.setContent(html);
    
    const parents = await page.evaluate(() => {
        let el = document.getElementById('view-shopping');
        let path = [];
        while(el && el !== document.body) {
            path.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
            el = el.parentNode;
        }
        return path;
    });
    
    console.log("DOM Path for view-shopping:", parents.reverse().join(' > '));
    await browser.close();
})();
