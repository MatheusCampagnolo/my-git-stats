require('dotenv').config();

const express = require('express');
const path = require('path');

const builderRoute = require('./routes/builder');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the builder directory
app.use('/builder-assets', express.static(path.join(__dirname, '..', 'public', 'builder')));

// Routes
app.get('/builder/:user?', builderRoute);

// Home redirect -> builder
app.get('/', (req, res) => {
  res.redirect('/builder');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[my-git-stats] Error:', err.message);
    
    // Return a styled error SVG so it renders nicely in GitHub READMEs
  const errorSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="495" height="120" viewBox="0 0 495 120">
  <rect width="495" height="120" rx="10" fill="#0D1117" stroke="#F85149" stroke-width="1"/>
  <text x="247" y="50" text-anchor="middle" font-family="'Segoe UI', Ubuntu, sans-serif" font-size="16" font-weight="600" fill="#F85149">
    ⚠ my-git-stats error
  </text>
  <text x="247" y="80" text-anchor="middle" font-family="'Segoe UI', Ubuntu, sans-serif" font-size="12" fill="#8B949E">
    ${err.message.replace(/[<>&"']/g, '')}
  </text>
</svg>`.trim();

  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.status(500).send(errorSvg);
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n ⚡ my-git-stats is running at http://localhost:${PORT}\n`);
});