export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  
  // Extract everything after /api/
  // Example: https://your-site.pages.dev/api/notes -> /notes
  const path = url.pathname.replace(/^\/api/, '');
  
  // The destination backend URL (Cloudflare Worker)
  const BACKEND_URL = context.env?.BACKEND_URL || 'https://washu-sim-intel.sphadnisuf.workers.dev';
  
  // Construct the new URL for the Worker
  const targetUrl = new URL(path + url.search, BACKEND_URL);
  
  // Forward the request to the Worker
  return fetch(targetUrl.toString(), context.request);
};
