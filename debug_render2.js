const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.static(__dirname));
const server = app.listen(3002, async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3002/index.html', { waitUntil: 'networkidle0' });
        
        const result = await page.evaluate(() => {
            let log = [];
            
            // MOCK LOGIN STATE
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById('view-workout').classList.remove('hidden');
            
            // Mock splits
            window.splits = [{
                id: 'split_1', name: 'Upper Lower',
                days: [
                    { name: 'Upper', exercises: [{ name: 'Bench', defaultSets: 3 }] }
                ]
            }];
            
            const btn = document.querySelector('[data-action="openSplitEdit"]');
            if(!btn) {
                log.push("Button not found!");
                return log;
            }
            
            btn.click();
            
            const view = document.getElementById('view-split-edit');
            const rect = view.getBoundingClientRect();
            log.push(`view-split-edit rect: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
            
            const header = view.querySelector('header');
            if(header) {
                 const hRect = header.getBoundingClientRect();
                 log.push(`header rect: w=${hRect.width}, h=${hRect.height}`);
            }
            
            return log;
        });
        
        console.log("Evaluation Result:");
        result.forEach(r => console.log(r));
        await page.setViewport({width: 390, height: 844}); await page.screenshot({path: "split_edit_test.png"}); await browser.close();
    } catch(err) {
        console.error(err);
    }
    server.close();
});
