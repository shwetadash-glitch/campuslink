const fs = require('fs');
const files = [
  'C:\\Users\\dashs\\campuselink\\backend-laravel\\.env',
  'C:\\Users\\dashs\\campuselink\\frontend\\.env.local'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let buf = fs.readFileSync(file);
    // Remove null bytes
    let cleanBuf = buf.filter(b => b !== 0);
    fs.writeFileSync(file, cleanBuf);
    console.log('Fixed null bytes in ' + file);
  }
});
