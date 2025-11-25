export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  currency: string;
  // Original object for fallback/debugging
  originalObject: any;
}

export interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  // Original object for fallback/debugging
  originalObject: any;
}

export interface IAPAdapter {
  /**
   * Initialize the adapter.
   * Returns true if initialization was successful.
   */
  initialize(): Promise<boolean>;

  /**
   * Get available products.
   */
  getProducts(productIds: string[]): Promise<Product[]>;

  /**
   * Purchase a product.
   */
  purchase(productId: string): Promise<Purchase>;

  /**
   * Restore previous purchases.
   */
  restore(): Promise<Purchase[]>;

  /**
   * Check if the user has an active subscription.
   * This might involve checking local history or validating a receipt.
   */
  getSubscriptionStatus(productIds: string[]): Promise<boolean>;
}
