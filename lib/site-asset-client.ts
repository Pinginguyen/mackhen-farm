export type PublicSiteAssetKey = 'B2B_HERO_BANNER' | 'TRACEABILITY_BANNER';

export async function fetchPublicSiteAsset(key: PublicSiteAssetKey, fallbackUrl: string): Promise<string> {
  try {
    const response = await fetch(`/api/public/site-assets?key=${key}`, { cache: 'no-store' });
    const result = await response.json() as { url?: string };
    return response.ok && result.url ? result.url : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}