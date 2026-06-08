const fs = require('fs');
const files = fs.readdirSync('dist/assets');
const js = files.find(f => f.endsWith('.js'));
const content = fs.readFileSync('dist/assets/' + js, 'utf8');
console.log('Includes margin:0:', content.includes('margin:0'));
console.log('Includes 16px title:', content.includes('fontSize:"16px"') || content.includes("fontSize:'16px'") || content.includes('fontSize:"16px",fontWeight:700'));
