export const MINI_PRODUCT_ID = "mini";
export const MINI_PRICE_PER_DOZEN = 15;
export const MINI_MINIMUM_DOZENS = 2;

export const isMiniProduct = (productId: string) => productId === MINI_PRODUCT_ID;

export const getMinimumQuantity = (productId: string) =>
  isMiniProduct(productId) ? MINI_MINIMUM_DOZENS : 1;

export const getEffectiveUnitPrice = (productId: string, price: number) =>
  isMiniProduct(productId) ? MINI_PRICE_PER_DOZEN : price;

export const getMiniMinimumOrderMessage = () =>
  `Mini pies require a minimum order of ${MINI_MINIMUM_DOZENS} dozen.`;
