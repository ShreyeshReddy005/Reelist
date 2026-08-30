const fs = require('fs');
let c = fs.readFileSync('src/components/ExtractionSplash.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('src/components/ExtractionSplash.tsx', c);
console.log('Fixed');
