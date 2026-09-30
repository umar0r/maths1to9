// Browser checks for every lesson. Run with: npx playwright test -c tests/ui
//
// By default this starts PHP's built-in server on the project, so XAMPP does
// not need to be running. Set BASE_URL (e.g. http://localhost/maths1to9/) to
// test a server that is already running instead.
const { defineConfig } = require('@playwright/test');
const os = require('node:os');
const path = require('node:path');

const PORT = 8765;
const PHP = process.env.PHP_BIN ?? '/Applications/XAMPP/xamppfiles/bin/php';
const projectRoot = path.join(__dirname, '..', '..');

module.exports = defineConfig({
    testDir: '.',
    testMatch: '*.spec.cjs',
    timeout: 60_000,
    fullyParallel: true,
    reporter: [['list']],
    // Keep screenshots and traces out of the project.
    outputDir: path.join(os.tmpdir(), 'maths1to9-ui-results'),
    webServer: process.env.BASE_URL ? undefined : {
        command: `"${PHP}" -S 127.0.0.1:${PORT} -t "${projectRoot}"`,
        url: `http://127.0.0.1:${PORT}/`,
        // Several PHP workers so parallel tests do not queue behind each other.
        env: { PHP_CLI_SERVER_WORKERS: '4' },
        reuseExistingServer: true,
        stdout: 'ignore',
        stderr: 'ignore'
    },
    use: {
        baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`,
        // Playwright's own Chromium (npx playwright install chromium), kept in
        // ~/Library/Caches/ms-playwright; Google Chrome is not needed.
        headless: true,
        // Fail fast (with the reason) instead of waiting on a disabled button.
        actionTimeout: 5_000,
        // Stop Chrome looking for Chromecasts and other devices on the local
        // network (this triggers macOS's "find devices on local networks" prompt).
        // The tests only use 127.0.0.1.
        launchOptions: {
            args: [
                '--disable-features=MediaRouter,DialMediaRouteProvider,CastMediaRouteProvider,GlobalMediaControls',
                '--disable-background-networking'
            ]
        }
    }
});
