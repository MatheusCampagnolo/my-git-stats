const path = require('path');
const fs = require('fs');

/**
 * GET /builder/:user?
 * 
 * Serves the visual builder intefarce
 * IF :user is provided, it's injected into the page so the builderl loads pre-filled
 */
function builderRoute(req, res) {
    const username = req.params.user || '';
    const htmlPath = path.join(__dirname, '..', '..', 'public', 'builder', 'index.html');

    fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) {
            console.error('[my-git-stats] Error loading builder page:', err);
            return res.status(500).send('Error loading builder page');
        }

        // Inject the username into the page via a script tag
        const injectedHtml = html.replace(
            '</body>',
            `<script>window.INITIAL_USERNAME = "${username.replace(/[^a-zA-Z0-9_-]/g, '')}";</script>\n</body>`
        );

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(injectedHtml);
    });
}

module.exports = builderRoute;