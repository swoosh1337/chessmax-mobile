import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// Try to import expo-in-app-purchases
let InAppPurchases: any = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (e) {
  console.log('[IAP] expo-in-app-purchases not available (Expo Go). IAP features disabled.');
}

// Check if we're in a native build with IAP support
const IAP_AVAILABLE = InAppPurchases !== null;

type Product = any;

// Product IDs - these must match what you create in App Store Connect
const SUBSCRIPTION_SKUS = Platform.select({
  ios: [
    'com.igrigolia.chessmaxmobile.weekly.trial',
    'com.igrigolia.chessmaxmobile.yearly',
  ],
  android: [
    // Add Android product IDs when ready
  ],
}) || [];

interface SubscriptionContextType {
  // Subscription state
  isPremium: boolean;
  isLoading: boolean;

  // Available products
  products: Product[];

  // Actions
  purchaseSubscription: (sku: string) => Promise<void>;
  restorePurchases: () => Promise<void>;

  // Error state
  error: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  /**
   * Initialize IAP connection and fetch products
   */
  useEffect(() => {
    // If IAP not available (Expo Go without dev build), treat as free user
    if (!IAP_AVAILABLE) {
      console.log('[IAP] Not available - running in Expo Go mode or missing package');
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    const initIAP = async () => {
      try {
        console.log('[IAP] Initializing connection...');
        await InAppPurchases.connectAsync();
        console.log('[IAP] Connection initialized');

        // Fetch available products
        console.log('[IAP] Fetching products:', SUBSCRIPTION_SKUS);
        const productsResponse = await InAppPurchases.getProductsAsync(SUBSCRIPTION_SKUS);

        if (productsResponse && productsResponse.responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('[IAP] Products fetched:', productsResponse.results);
          setProducts(productsResponse.results || []);
        } else {
          console.warn('[IAP] Failed to fetch products:', productsResponse?.responseCode);
        }

        // Check existing purchases
        await checkSubscriptionStatus();

        setInitialized(true);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[IAP] Init error:', err);
        setError(err.message || 'Failed to initialize purchases');
        setIsLoading(false);
      }
    };

    initIAP();

    // Cleanup
    return () => {
      if (InAppPurchases && initialized) {
        InAppPurchases.disconnectAsync().catch((e: any) =>
          console.warn('[IAP] Disconnect error:', e)
        );
      }
    };
  }, []);

  /**
   * Check if user has an active subscription
   */
  const checkSubscriptionStatus = useCallback(async () => {
    if (!IAP_AVAILABLE) {
      return false;
    }

    try {
      console.log('[IAP] Checking subscription status...');
      const history = await InAppPurchases.getPurchaseHistoryAsync();

      if (!history || history.responseCode !== InAppPurchases.IAPResponseCode.OK) {
        console.log('[IAP] No purchase history available');
        return false;
      }

      console.log('[IAP] Purchase history:', history.results?.length || 0, 'purchases');

      // Check if any purchase is for our subscription products
      const hasActiveSub = history.results?.some((purchase: any) => {
        return SUBSCRIPTION_SKUS.includes(purchase.productId);
      }) || false;

      console.log('[IAP] Has active subscription:', hasActiveSub);
      setIsPremium(hasActiveSub);

      return hasActiveSub;
    } catch (err) {
      console.error('[IAP] Error checking subscription:', err);
      return false;
    }
  }, []);

  /**
   * Purchase a subscription
   */
  const purchaseSubscriptionFn = useCallback(async (sku: string) => {
    if (!IAP_AVAILABLE) {
      throw new Error('In-app purchases not available. Please use a development build.');
    }

    try {
      setError(null);
      console.log('[IAP] Starting purchase for:', sku);

      // Verify product exists
      const productsResponse = await InAppPurchases.getProductsAsync([sku]);

      if (!productsResponse || productsResponse.responseCode !== InAppPurchases.IAPResponseCode.OK) {
        throw new Error('Unable to connect to the App Store. Please try again.');
      }

      if (!productsResponse.results || productsResponse.results.length === 0) {
        throw new Error('Product not found. Please check your configuration.');
      }

      console.log('[IAP] Product found, initiating purchase...');

      // Initiate purchase
      await InAppPurchases.purchaseItemAsync(sku);

      console.log('[IAP] Purchase initiated, polling for completion...');

      // Poll purchase history until we find the purchase (max 30 seconds)
      const maxAttempts = 30;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        try {
          const history = await InAppPurchases.getPurchaseHistoryAsync();

          if (history && history.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
            const purchase = history.results.find((p: any) => p.productId === sku);

            if (purchase) {
              console.log('[IAP] ✅ Purchase found, processing...');

              // Finish the transaction
              if (!purchase.acknowledged) {
                await InAppPurchases.finishTransactionAsync(purchase, false);
                console.log('[IAP] Transaction finished');
              }

              // Update premium status
              setIsPremium(true);
              return;
            }
          }
        } catch (pollError) {
          console.error('[IAP] Error polling purchase history:', pollError);
        }
      }

      // Timeout after 30 seconds
      throw new Error('Purchase timeout. If you completed the purchase, please use "Restore Purchases".');
    } catch (err: any) {
      console.error('[IAP] Purchase error:', err);

      // Don't show error for user cancellation
      if (err.code !== 'E_USER_CANCELLED') {
        setError(err.message || 'Purchase failed');
      }

      throw err;
    }
  }, []);

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async () => {
    if (!IAP_AVAILABLE) {
      throw new Error('In-app purchases not available. Please use a development build.');
    }

    try {
      setError(null);
      console.log('[IAP] Restoring purchases...');

      const history = await InAppPurchases.getPurchaseHistoryAsync();

      if (!history || history.responseCode !== InAppPurchases.IAPResponseCode.OK) {
        throw new Error('Unable to connect to the App Store. Please try again.');
      }

      if (!history.results || history.results.length === 0) {
        setError('No previous purchases found');
        throw new Error('No previous purchases found');
      }

      console.log('[IAP] Found', history.results.length, 'previous purchase(s)');

      // Check if any purchase is for our subscription products
      const subscriptionPurchases = history.results.filter((purchase: any) =>
        SUBSCRIPTION_SKUS.includes(purchase.productId)
      );

      if (subscriptionPurchases.length === 0) {
        setError('No subscription purchases found');
        throw new Error('No subscription purchases found');
      }

      console.log('[IAP] Found', subscriptionPurchases.length, 'subscription purchase(s)');

      // Update premium status
      setIsPremium(true);

      console.log('[IAP] ✅ Purchases restored successfully');
    } catch (err: any) {
      console.error('[IAP] Restore error:', err);
      setError(err.message || 'Failed to restore purchases');
      throw err;
    }
  }, []);

  const value: SubscriptionContextType = {
    isPremium,
    isLoading,
    products,
    purchaseSubscription: purchaseSubscriptionFn,
    restorePurchases,
    error,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
