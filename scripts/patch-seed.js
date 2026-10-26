const fs = require('fs');
let s = fs.readFileSync('prisma/seed.js', 'utf8');
s = s.replaceAll('label: "', 'title: "Túi 150g", label: "');
s = s.replaceAll("label: '", "title: 'Túi 150g', label: '");
fs.writeFileSync('prisma/seed.js', s);
console.log('✅ Đã vá xong file seed.js!');
