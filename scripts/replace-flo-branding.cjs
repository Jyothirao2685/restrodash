const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../frontend/src/lib/i18n/messages');
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(messagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. FloPOS / Flo POS -> Restro Dash
  content = content.replace(/\bFlo\s*POS\b/gi, 'Restro Dash');

  // 2. FloCafe / Flo Cafe -> Restro Dash
  content = content.replace(/\bFlo\s*Cafe\b/gi, 'Restro Dash');

  // 3. FloAdmin -> Restro Admin
  content = content.replace(/\bFloAdmin\b/g, 'Restro Admin');

  // 4. flopos.com -> restrodash.com
  content = content.replace(/flopos\.com/gi, 'restrodash.com');

  // 5. flo.local -> restrodash.local
  content = content.replace(/flo\.local/gi, 'restrodash.local');

  // 6. Generic/localized phrases where Flo stands for the POS
  content = content.replace(/\bSend via Flo\b/g, 'Send via Restro Dash');
  content = content.replace(/\bAbout Flo\b/g, 'About Restro Dash');
  content = content.replace(/\bFlo Printer Test\b/g, 'Restro Dash Printer Test');
  content = content.replace(/Test d'imprimante Flo\b/g, "Test d'imprimante Restro Dash");
  content = content.replace(/\bTest stampante Flo\b/g, 'Test stampante Restro Dash');
  content = content.replace(/\bTeste da impressora Flo\b/g, 'Teste da impressora Restro Dash');
  content = content.replace(/\bUji printer Flo\b/g, 'Uji printer Restro Dash');
  content = content.replace(/\bFlo-printertest\b/g, 'Restro Dash-printertest');
  content = content.replace(/\bTesti i printerit Flo\b/g, 'Testi i printerit Restro Dash');
  content = content.replace(/Kiểm tra máy in Flo\b/g, 'Kiểm tra máy in Restro Dash');
  content = content.replace(/Flo is up to date\b/g, 'Restro Dash is up to date');
  content = content.replace(/Flo is online\b/g, 'Restro Dash is online');
  content = content.replace(/Flo runs an embedded\b/g, 'Restro Dash runs an embedded');
  content = content.replace(/Flo keeps a copy\b/g, 'Restro Dash keeps a copy');
  content = content.replace(/Flo helps by honoring\b/g, 'Restro Dash helps by honoring');
  content = content.replace(/Flo isn't connected\b/g, "Restro Dash isn't connected");
  content = content.replace(/Numbers here will never receive messages from Flo\b/g, 'Numbers here will never receive messages from Restro Dash');
  content = content.replace(/so Flo can send paid bills\b/g, 'so Restro Dash can send paid bills');
  content = content.replace(/Flo generates an 8-digit code\b/g, 'Restro Dash generates an 8-digit code');

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Successfully updated brand names in 24 translation files.');
