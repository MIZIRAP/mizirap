const { Jimp } = require('jimp');

(async () => {
    try {
        const image = await Jimp.read('split_edit_test.png');
        let hasNonWhite = false;
        let whitePixels = 0;
        let totalPixels = 0;
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            totalPixels++;
            if (r > 240 && g > 240 && b > 240) {
                whitePixels++;
            } else {
                hasNonWhite = true;
            }
        });
        console.log(`Dimensions: ${image.bitmap.width}x${image.bitmap.height}`);
        console.log(`White/Light pixels: ${whitePixels} / ${totalPixels}`);
        console.log(`Has non-white pixels: ${hasNonWhite}`);
    } catch(err) {
        console.error(err);
    }
})();
