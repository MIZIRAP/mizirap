const fs = require('fs');

const file = '/Users/boratektas/Desktop/mizirap/workout.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const defaultCores = \[([\s\S]*?)\];/;
const match = content.match(regex);

if (match) {
    let listStr = match[1];
    
    // Using a regex to replace missing categories or update them.
    // Actually, let's just generate the whole defaultCores array as a string.
    const newDefaultCoresStr = `const defaultCores = [
    { name: "Crunch", category: "Üst Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "V-Up", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Superman (Back Extension)", category: "Bel/Sırt", duration: "30", isDefault: true, imageBase64: null },
    { name: "Spiderman Plank", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Mountain Climber", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Dead Bug", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Plank (Front Plank)", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Heel Taps (Penguin Taps)", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Flutter Kicks", category: "Alt Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Plank Jacks", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Toe Touches", category: "Üst Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Russian Twist", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Hollow Body Hold", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Ab Wheel Rollout", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Lying Leg Raise", category: "Alt Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Side Plank", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Windshield Wipers", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Bird Dog", category: "Bel/Sırt", duration: "30", isDefault: true, imageBase64: null }
];`;

    content = content.replace(regex, newDefaultCoresStr);
    fs.writeFileSync(file, content);
}
