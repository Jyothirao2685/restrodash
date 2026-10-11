const http = require('http');

function testUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3045${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          size: data.length
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('Running automated route verification on http://localhost:3045 ...');

  const tests = [
    { path: '/', expectedStatus: 200, checks: ['<link rel="canonical" href="https://restrodash.in"', 'RestroDash Technologies', 'application/ld+json', '<html lang="en" dir="ltr">', 'og:image'] },
    { path: '/onboarding', expectedStatus: 200, checks: ['<link rel="canonical" href="https://restrodash.in/onboarding"', 'Onboarding &amp; Deployment', 'og:image'] },
    { path: '/does-not-exist-xyz', expectedStatus: 404, checks: ['The requested route does not exist', 'Error 404 • Resource Not Found'] },
    { path: '/robots.txt', expectedStatus: 200, checks: ['User-Agent: *', 'Allow: /', 'Disallow: /api/', 'https://restrodash.in/sitemap.xml'] },
    { path: '/sitemap.xml', expectedStatus: 200, checks: ['https://restrodash.in', 'https://restrodash.in/onboarding', 'urlset'] },
    { path: '/llms.txt', expectedStatus: 200, checks: ['# RestroDash', 'Offline-First SQLite WAL Engine', 'https://restrodash.in'] },
    { path: '/favicon.ico', expectedStatus: 200, checks: [] },
    { path: '/og-image.png', expectedStatus: 200, checks: [] }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = await testUrl(t.path);
      const statusOk = res.statusCode === t.expectedStatus;
      let contentOk = true;
      for (const check of t.checks) {
        if (!res.body.includes(check)) {
          console.error(`  FAIL [${t.path}]: Missing expected content "${check}"`);
          contentOk = false;
        }
      }

      if (statusOk && contentOk) {
        console.log(`  PASS [${t.path}] status=${res.statusCode} length=${res.size} bytes`);
        passed++;
      } else {
        console.error(`  FAIL [${t.path}] status=${res.statusCode} (expected ${t.expectedStatus})`);
      }
    } catch (err) {
      console.error(`  ERROR [${t.path}]:`, err.message);
    }
  }

  // Also check security headers on homepage
  const homeRes = await testUrl('/');
  console.log('\nChecking Security Headers on /:');
  console.log('  x-content-type-options:', homeRes.headers['x-content-type-options']);
  console.log('  x-frame-options:', homeRes.headers['x-frame-options']);
  console.log('  referrer-policy:', homeRes.headers['referrer-policy']);
  console.log('  x-powered-by:', homeRes.headers['x-powered-by'] || '(none - poweredByHeader disabled)');

  if (passed === tests.length) {
    console.log(`\nALL ${passed}/${tests.length} ROUTE VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  } else {
    console.error(`\nSOME TESTS FAILED: ${passed}/${tests.length}`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
