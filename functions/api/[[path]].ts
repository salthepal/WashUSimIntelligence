function getSafeApiPath(url: URL): string {
  const path = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError('Invalid API path.');
  }

  return path;
}

export function buildProxyTarget(requestUrl: string, backendUrl: string): URL {
  const request = new URL(requestUrl);
  const backend = new URL(backendUrl);

  if (backend.protocol !== 'https:' && backend.protocol !== 'http:') {
    throw new TypeError('Invalid API backend URL.');
  }

  const target = new URL(backend);
  target.pathname = getSafeApiPath(request);
  target.search = request.search;
  target.hash = '';

  if (target.origin !== backend.origin) {
    throw new TypeError('API proxy target escaped the configured backend origin.');
  }

  return target;
}

export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);

  let path: string;
  try {
    path = getSafeApiPath(url);
  } catch {
    return new Response('Invalid API path.', { status: 400 });
  }

  if (context.env?.WASHU_SIM_INTEL_API?.fetch) {
    const serviceUrl = new URL(path + url.search, 'https://washu-sim-intel.internal');
    const proxiedRequest = new Request(serviceUrl.toString(), context.request);
    return context.env.WASHU_SIM_INTEL_API.fetch(proxiedRequest);
  }

  const BACKEND_URL = context.env?.BACKEND_URL;
  if (!BACKEND_URL) {
    return new Response('API service binding is not configured.', { status: 503 });
  }

  let targetUrl: URL;
  try {
    targetUrl = buildProxyTarget(context.request.url, BACKEND_URL);
  } catch {
    return new Response('API backend configuration is invalid.', { status: 503 });
  }

  return fetch(targetUrl.toString(), context.request);
};
