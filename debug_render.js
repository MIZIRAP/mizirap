const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(__dirname));
const server = app.listen(3001, async () => {
    console.log("Server started on port 3001");
    
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
        
        await page.goto('http://localhost:3001/index.html', { waitUntil: 'networkidle0' });
        
        const result = await page.evaluate(() => {
            let log = [];
            
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
            
            log.push("Clicking button...");
            btn.click();
            
            // wait a little bit synchronously isn't possible, we will just return state
            const view = document.getElementById('view-split-edit');
            if(!view) {
                log.push("view-split-edit not found!");
                return log;
            }
            
            log.push(`view-split-edit classList: ${view.classList.toString()}`);
            
            const rect = view.getBoundingClientRect();
            log.push(`view-split-edit rect: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
            
            const main = document.getElementById('split-edit-main-container');
            if(!main) {
                log.push("split-edit-main-container not found!");
            } else {
                log.push(`split-edit-main-container child count: ${main.children.length}`);
                log.push(`split-edit-main-container innerHTML length: ${main.innerHTML.length}`);
            }
            
            return log;
        });
        
        console.log("Evaluation Result:");
        result.forEach(r => console.log(r));
        
        // Wait and check again
        await new Promise(r => setTimeout(r, 1000));
        
        const result2 = await page.evaluate(() => {
            let log = [];
            const view = document.getElementById('view-split-edit');
            const rect = view.getBoundingClientRect();
            log.push(`After 1s - view-split-edit rect: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
            return log;
        });
        
        console.log("Evaluation Result 2:");
        result2.forEach(r => console.log(r));
        
        await browser.close();
    } catch(err) {
        console.error(err);
    }
    server.close();
});
