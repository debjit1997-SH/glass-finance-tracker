import http from 'node:http';
import auth from '../api/auth.js';
import sheets from '../api/sheets.js';
http
  .createServer((req, res) => {
    const path = new URL(req.url, 'http://local').pathname;
    if (path === '/api/auth') void auth(req, res);
    else if (path === '/api/sheets') void sheets(req, res);
    else {
      res.statusCode = 404;
      res.end('Not found');
    }
  })
  .listen(8787, '127.0.0.1', () =>
    console.log('Local finance API on 127.0.0.1:8787')
  );
