const PROXY_BASE = 'https://wsrv.nl/?url='

export function proxyImageUrl(url) {
  if (!url) return url
  if (url.includes('driftworks.com')) {
    return `${PROXY_BASE}${encodeURIComponent(url)}`
  }
  return url
}
