const fs = require('fs');
let content = fs.readFileSync('src/pages/Workspace.jsx', 'utf8');
content = content.replace(/padding: '32px'/g, "padding: '24px'");
content = content.replace(/marginBottom: '32px'/g, "marginBottom: '24px'");
fs.writeFileSync('src/pages/Workspace.jsx', content);
