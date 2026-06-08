const https = require('https');
https.get('https://collabnest-silk.vercel.app', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/src="([^"]+index[^"]+\.js)"/);
    if (match) {
      console.log('JS File:', match[1]);
      const jsUrl = 'https://collabnest-silk.vercel.app' + match[1];
      https.get(jsUrl, (jsRes) => {
        let jsData = '';
        jsRes.on('data', (chunk) => { jsData += chunk; });
        jsRes.on('end', () => {
          console.log('Length:', jsData.length);
          const has16px = jsData.includes('fontSize:"16px"') || jsData.includes("fontSize:'16px'") || jsData.includes('16px');
          const hasMargin0 = jsData.includes('margin:0');
          console.log('Has 16px font?', has16px);
          console.log('Has margin 0?', hasMargin0);
        });
      });
    } else {
      console.log('No JS file found:', data);
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
