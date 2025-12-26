const fs = require('fs');
const puzzles = require('./public/puzzles.json');

const dates = new Set();
const answers = new Set();
const themes = {
    0: "Wildcard", // Sunday
    1: "Around the World", // Monday
    2: "Genius Ideas", // Tuesday
    3: "Famous People", // Wednesday
    4: "Pop Culture", // Thursday
    5: "Food & Fun", // Friday
    6: "Sports & Games", // Saturday
};

puzzles.forEach((p, index) => {
    if (dates.has(p.date)) {
        console.log(`Duplicate date found: ${p.date} at index ${index}`);
    }
    dates.add(p.date);

    // Check theme consistency
    // Note: Date ctor uses local time usually, but YYYY-MM-DD is UTC in JS if not careful? 
    // "YYYY-MM-DD" is interpreted as UTC by Date.parse usually.
    // But new Date(y, m, d) is local.
    const [y, m, d] = p.date.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    const day = localDate.getDay();

    if (themes[day] !== p.theme) {
        console.log(`Theme mismatch for ${p.date} (${localDate.toDateString()}): Expected ${themes[day]}, got ${p.theme}`);
    }

    // Check answers for duplicates (warn)
    if (answers.has(p.answer.toLowerCase())) {
        console.log(`Duplicate answer found: ${p.answer} at index ${index}`);
    }
    answers.add(p.answer.toLowerCase());
});

console.log(`Checked ${puzzles.length} puzzles.`);
