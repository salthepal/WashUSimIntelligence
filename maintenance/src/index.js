const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>WUEM Sim Intel temporarily unavailable</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f5f2;
        color: #2b2522;
      }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
      }
      main {
        width: min(36rem, calc(100% - 3rem));
        padding: 3rem 0;
      }
      p {
        line-height: 1.65;
      }
      a {
        color: #8b1d2c;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>WUEM Sim Intel is temporarily unavailable</h1>
      <p>
        This application has been paused while it undergoes institutional review.
        No project data has been deleted.
      </p>
      <p><a href="https://wuemsim.org/">Return to WUEM Simulation</a></p>
    </main>
  </body>
</html>`;

export default {
  fetch() {
    return new Response(page, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Referrer-Policy': 'no-referrer',
        'Retry-After': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });
  },
};
