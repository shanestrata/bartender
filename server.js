require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { migrate, seedAdmin } = require('./src/db');
const api = require('./src/api');

const app = express();
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

app.use('/api', api);

const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC));

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await migrate();
    await seedAdmin();
  } catch (e) {
    console.error('[boot] startup error:', e.message);
  }
  app.listen(PORT, () => console.log(`[boot] Grove Bar on :${PORT}`));
})();
