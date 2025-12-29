import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { IAPAdapter, Product } from '../services/iap/types';
import { RevenueCatAdapter } from '../services/iap/RevenueCatAdapter';
import { StoreKitAdapter } from '../services/iap/StoreKitAdapter';
import { createLogger } from '../utils/logger';

const log = createLogger('IAP');

// Define a minimal User interface since AuthContext is JS
interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
}

// Developer emails that get lifetime premium access
// Set DISABLE_DEVELOPER_ACCESS=true in environment to disable for testing
const DISABLE_DEVELOPER_ACCESS = process.env.EXPO_PUBLIC_DISABLE_DEVELOPER_ACCESS === 'true';

const DEVELOPER_EMAILS = [
  'tazigrigolia@gmail.com',
  'nugzarchkh@gmail.com',
  'giochkhaidze10@gmail.com',
];

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
  usingFallback: boolean;

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
  const { user } = useAuth() as AuthContextType;
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const adapterRef = useRef<IAPAdapter | null>(null);
  const initializingRef = useRef(false);

  // Check if current user is a developer with lifetime access
  const isDeveloper = !DISABLE_DEVELOPER_ACCESS && user?.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase());

  /**
   * Initialize IAP connection and fetch products
   */
  useEffect(() => {
    // Reset state when user changes
    log.debug(' User changed, resetting subscription state');
    setIsPremium(false);
    setIsLoading(true);
    initializingRef.current = false;
    adapterRef.current = null;

    // Guest users
    if (!user) {
      log.debug(' Guest user - no premium access');
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    // Developer access
    if (isDeveloper) {
      log.debug(' Developer account detected - granting lifetime premium access');
      setIsPremium(true);
      setIsLoading(false);
      return;
    }

    if (initializingRef.current) return;

    const initIAP = async () => {
      initializingRef.current = true;
      try {
        log.debug(' Initializing...');

        // Try RevenueCat first
        const rcAdapter = new RevenueCatAdapter();
        const rcInitialized = await rcAdapter.initialize();

        if (rcInitialized) {
          log.debug(' Using RevenueCat adapter');
          adapterRef.current = rcAdapter;
          setUsingFallback(false);
        } else {
          log.warn(' RevenueCat failed to initialize, falling back to StoreKit');
          const skAdapter = new StoreKitAdapter();
          const skInitialized = await skAdapter.initialize();

          if (skInitialized) {
            log.debug(' Using StoreKit fallback adapter');
            adapterRef.current = skAdapter;
            setUsingFallback(true);
          } else {
            throw new Error('All IAP adapters failed to initialize');
          }
        }

        if (adapterRef.current) {
          // Fetch products
          log.debug(' Fetching products:', SUBSCRIPTION_SKUS);
          const fetchedProducts = await adapterRef.current.getProducts(SUBSCRIPTION_SKUS);
          setProducts(fetchedProducts);
          log.debug(' Products fetched:', fetchedProducts.length);

          // Check status
          const hasActiveSub = await adapterRef.current.getSubscriptionStatus(SUBSCRIPTION_SKUS);
          log.debug(' Has active subscription:', hasActiveSub);
          setIsPremium(hasActiveSub);
        }

        setIsLoading(false);
      } catch (err: any) {
        log.error(' Init error:', err);

        // In development (Expo Go or simulator), IAP will fail - that's expected
        // Don't show error to user, just log it
        const isDevelopmentEnvironment = __DEV__ || err.message?.includes('Expo Go') || err.message?.includes('simulator');

        if (isDevelopmentEnvironment) {
          log.warn(' Running in development environment - IAP features disabled');
          setError(null); // Don't show error to user
        } else {
          setError(err.message || 'Failed to initialize purchases');
        }

        setIsLoading(false);
      } finally {
        initializingRef.current = false;
      }
    };

    initIAP();
  }, [user?.id, isDeveloper]);

  /**
   * Purchase a subscription
   */
  const purchaseSubscription = useCallback(async (sku: string) => {
    if (!user) throw new Error('You must be signed in to purchase.');
    if (!adapterRef.current) throw new Error('IAP not initialized');

    try {
      setError(null);
      log.debug(' Purchasing:', sku);

      await adapterRef.current.purchase(sku);

      // If purchase successful (no error thrown), update status
      // Some adapters might need a re-check, but usually purchase returns success
      setIsPremium(true);
      log.debug(' Purchase successful');
    } catch (err: any) {
      log.error(' Purchase error:', err);
      if (err.message !== 'User cancelled') {
        setError(err.message || 'Purchase failed');
      }
      throw err;
    }
  }, [user]);

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async () => {
    if (!adapterRef.current) throw new Error('IAP not initialized');

    try {
      setError(null);
      log.debug(' Restoring purchases...');

      const restored = await adapterRef.current.restore();
      log.debug(' Restored:', restored.length);

      if (restored.length > 0) {
        // Verify if any restored purchase matches our SKUs
        // This logic depends on the adapter's restore implementation returning relevant items
        // For simplicity, if we get anything back, we re-check status or assume valid if it matches known SKUs

        // Ideally we should check against SUBSCRIPTION_SKUS
        const hasValidRestore = restored.some(p => SUBSCRIPTION_SKUS.includes(p.productId));

        if (hasValidRestore) {
          setIsPremium(true);
          log.debug(' Restore successful, premium granted');
        } else {
          throw new Error('No active subscriptions found to restore');
        }
      } else {
        throw new Error('No purchases found to restore');
      }
    } catch (err: any) {
      log.error(' Restore error:', err);
      setError(err.message || 'Failed to restore purchases');
      throw err;
    }
  }, []);

  const value: SubscriptionContextType = {
    isPremium,
    isLoading,
    usingFallback,
    products,
    purchaseSubscription,
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
