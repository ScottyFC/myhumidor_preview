/** Make remote image URLs safe for the iOS WKWebView, whose WebP/ICC decoder
 *  rejects some files ("WEBP initImage failed err=-50", "profile tags overlap").
 *  For imgix-served images (e.g. mshanken.imgix.net band photos) we force a
 *  baseline JPEG in the sRGB color space, which the webview always decodes. */
export function safeImg(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    if (/(^|\.)imgix\.net\//.test(url)) {
      const [base] = url.split('#');
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}fm=jpg&cs=srgb&auto=compress&q=78&w=600`;
    }
  } catch { /* fall through */ }
  return url;
}
