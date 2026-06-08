const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}
const files = walk('src');
files.filter(f => f.endsWith('.jsx') || f.endsWith('.js')).forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /from\s+['"](.*?)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const imp = match[1];
    if (imp.startsWith('.')) {
      const target = path.resolve(path.dirname(f), imp);
      const ex = fs.existsSync(target) || fs.existsSync(target+'.js') || fs.existsSync(target+'.jsx') || fs.existsSync(target+'.css');
      if (!ex) console.log('Case issue or missing file:', imp, 'in', f);
    }
  }
});
