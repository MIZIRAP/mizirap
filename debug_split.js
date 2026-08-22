const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
    
    // Catch unhandled rejections
    page.evaluateOnNewDocument(() => {
        window.addEventListener('unhandledrejection', event => {
            console.error('Unhandled Rejection:', event.reason);
        });
        window.addEventListener('error', event => {
            console.error('Window Error:', event.message, event.filename, event.lineno);
        });
    });

    const fileUrl = `file://${path.join(__dirname, 'index.html')}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
        // mock variables
        window.splits = [{
            id: 'split_1', name: 'Upper Lower',
            days: [
                { name: 'Upper', exercises: [{ name: 'Bench', sets: 3 }] },
                { name: 'Lower', exercises: [{ name: 'Squat', sets: 3 }] }
            ]
        }];
        
        try {
            // Un-hide the view so it tries to render properly
            document.getElementById('view-workout').classList.add('hidden');
            document.getElementById('view-split-edit').classList.remove('hidden');
            
            if(typeof openSplitEdit === 'function') {
                openSplitEdit();
            } else {
                console.error("openSplitEdit is not defined");
            }
        } catch(e) {
            console.error("Caught error:", e.message, e.stack);
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'split_edit_test.png' });
    await browser.close();
})();
