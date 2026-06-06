require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/builder-assets', express.static(path.join(__dirname, '..', 'public', 'builder')));

app.get('/', (req, res) => {
  res.redirect('/builder');
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n ⚡ my-git-stats is running at http://localhost:${PORT}\n`);
});