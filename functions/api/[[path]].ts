export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);

  // Extract everything after /api/
  // Example: https://your-site.pages.dev/api/notes -> /notes
  const path = url.pathname.replace(/^\/api/, '');

  if (context.env?.WASHU_SIM_INTEL_API?.fetch) {
    const serviceUrl = new URL(path + url.search, 'https://washu-sim-intel.internal');
    const proxiedRequest = new Request(serviceUrl.toString(), context.request);
    return context.env.WASHU_SIM_INTEL_API.fetch(proxiedRequest);
  }

  const BACKEND_URL = context.env?.BACKEND_URL;
  if (!BACKEND_URL) {
    return new Response('API service binding is not configured.', { status: 503 });
  }

  // Construct the new URL for the Worker
  const targetUrl = new URL(path + url.search, BACKEND_URL);

  // Forward the request to the Worker
  return fetch(targetUrl.toString(), context.request);
};
