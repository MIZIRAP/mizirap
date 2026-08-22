const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(__dirname));
const server = app.listen(3000, async () => {
    console.log("Server started on port 3000");
    
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
        
        page.evaluateOnNewDocument(() => {
            window.addEventListener('unhandledrejection', event => {
                console.error('Unhandled Rejection:', event.reason);
            });
            window.addEventListener('error', event => {
                console.error('Window Error:', event.message, event.filename, event.lineno);
            });
        });

        await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });
        
        await page.evaluate(() => {
            // Mock splits
            window.splits = [{
                id: 'split_1', name: 'Upper Lower',
                days: [
                    { name: 'Upper', exercises: [{ name: 'Bench', defaultSets: 3 }] },
                    { name: 'Lower', exercises: [{ name: 'Squat', defaultSets: 3 }] }
                ]
            }];
            
            // Try to open split edit
            try {
                // Find and click the "Split Düzenle" button
                const btn = document.querySelector('[data-action="openSplitEdit"]');
                if(btn) {
                    btn.click();
                } else {
                    console.error("Split Düzenle button not found!");
                }
            } catch(e) {
                console.error("Caught error during click:", e.message, e.stack);
            }
        });
        
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'split_edit_test.png' });
        await browser.close();
    } catch(err) {
        console.error(err);
    }
    server.close();
});
