export const marketingAssetFiles = [
  ["src/assets/mini-pies-tray.png", "/marketing-assets/mini-pies-tray.png"],
  ["src/assets/product-mini.jpg", "/marketing-assets/product-mini.jpg"],
  ["src/assets/product-spicy.png", "/marketing-assets/product-spicy.png"],
  ["src/assets/product-beef-pork.jpg", "/marketing-assets/product-beef-pork.jpg"],
  ["src/assets/product-spicy.jpg", "/marketing-assets/product-spicy.jpg"],
  ["src/assets/product-turkey.png", "/marketing-assets/product-turkey.png"],
  ["src/assets/product-turkey.jpg", "/marketing-assets/product-turkey.jpg"],
  ["src/assets/hero-meat-pies.png", "/marketing-assets/hero-meat-pies.png"],
  ["src/assets/hero-meatpies.jpg", "/marketing-assets/hero-meatpies.jpg"],
  ["src/assets/mame-kitchen-1.jpg", "/marketing-assets/mame-kitchen-1.jpg"],
  ["src/assets/mame-kitchen-2.jpg", "/marketing-assets/mame-kitchen-2.jpg"],
  ["src/assets/mame-portrait-2026.jpg", "/marketing-assets/mame-portrait-2026.jpg"],
  ["src/assets/mame-portrait-2026 2.jpg", "/marketing-assets/mame-portrait-2026-2.jpg"],
] as const;

export const marketingAssetOptions = marketingAssetFiles.map(([asset]) => asset);

export const marketingAssetPublicPathMap = Object.fromEntries(marketingAssetFiles) as Record<string, string>;

export const getMarketingAssetPublicPath = (value: string) => marketingAssetPublicPathMap[value];

export const getMarketingAssetPublicUrl = (siteUrl: string, value: string) => {
  const path = getMarketingAssetPublicPath(value);

  if (!path) {
    return null;
  }

  return `${siteUrl.replace(/\/$/, "")}${path}`;
};
