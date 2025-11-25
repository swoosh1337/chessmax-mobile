import Purchases, { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { IAPAdapter, Product, Purchase } from './types';

// Placeholder key - should be replaced by env var or user input
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'appl_PLACEHOLDER';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'goog_PLACEHOLDER';

export class RevenueCatAdapter implements IAPAdapter {
    private initialized = false;

    async initialize(): Promise<boolean> {
        try {
            if (this.initialized) {
                console.log('[RevenueCat] Already initialized');
                return true;
            }

            console.log('[RevenueCat] Starting initialization...');
            console.log('[RevenueCat] Platform:', Platform.OS);

            const apiKey = Platform.select({
                ios: REVENUECAT_API_KEY_IOS,
                android: REVENUECAT_API_KEY_ANDROID,
            });

            console.log('[RevenueCat] API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

            if (!apiKey || apiKey.includes('PLACEHOLDER')) {
                console.warn('[RevenueCat] No valid API key found. Please set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS in .env');
                return false;
            }

            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                await Purchases.configure({ apiKey });
                this.initialized = true;
                console.log('[RevenueCat] ✅ Initialized successfully');

                // Log customer info for debugging
                const customerInfo = await Purchases.getCustomerInfo();
                console.log('[RevenueCat] Customer ID:', customerInfo.originalAppUserId);

                return true;
            }

            console.warn('[RevenueCat] Unsupported platform:', Platform.OS);
            return false;
        } catch (error) {
            console.error('[RevenueCat] ❌ Initialization failed:', error);
            return false;
        }
    }

    async getProducts(productIds: string[]): Promise<Product[]> {
        try {
            console.log('[RevenueCat] Fetching offerings...');
            const offerings = await Purchases.getOfferings();

            console.log('[RevenueCat] Offerings received:', {
                current: offerings.current?.identifier,
                all: Object.keys(offerings.all),
            });

            if (!offerings.current || !offerings.current.availablePackages) {
                console.warn('[RevenueCat] No current offerings found');
                return [];
            }

            const packages = offerings.current.availablePackages;
            console.log('[RevenueCat] Available packages:', packages.map(pkg => ({
                identifier: pkg.identifier,
                productId: pkg.product.identifier,
                price: pkg.product.priceString,
            })));

            return packages.map(this.mapPackageToProduct);
        } catch (error) {
            console.error('[RevenueCat] Error fetching products:', error);
            throw error;
        }
    }

    async purchase(productId: string): Promise<Purchase> {
        try {
            // Find the package that corresponds to the productId
            // In RevenueCat, we purchase Packages, not raw product IDs usually, 
            // but for this adapter we need to map back.
            // Ideally, we should pass the Package object, but to keep the interface generic:
            const offerings = await Purchases.getOfferings();
            const pkg = offerings.current?.availablePackages.find(
                p => p.product.identifier === productId || p.identifier === productId
            );

            if (!pkg) {
                throw new Error('Product not found in current offering');
            }

            const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);

            // We don't get a transaction object directly comparable to StoreKit's immediately here
            // without digging into customerInfo.entitlements.
            // For simplicity, we construct a success object.

            return {
                productId: productIdentifier,
                transactionId: customerInfo.originalAppUserId, // Fallback as we don't always get txId easily here
                transactionDate: Date.now(),
                originalObject: customerInfo,
            };
        } catch (error: any) {
            if (error.userCancelled) {
                throw new Error('User cancelled');
            }
            throw error;
        }
    }

    async restore(): Promise<Purchase[]> {
        try {
            const customerInfo = await Purchases.restorePurchases();
            // Map active entitlements to "Purchases"
            // This is a bit of a loose mapping because RevenueCat manages state, not just transactions.

            const activeEntitlements = Object.values(customerInfo.entitlements.active);

            return activeEntitlements.map(entitlement => ({
                productId: entitlement.productIdentifier,
                transactionId: 'restored',
                transactionDate: entitlement.latestPurchaseDateMillis,
                originalObject: entitlement,
            }));
        } catch (error) {
            console.error('[RevenueCat] Restore failed:', error);
            throw error;
        }
    }

    async getSubscriptionStatus(productIds: string[]): Promise<boolean> {
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            console.log('[RevenueCat] Customer Info:', {
                activeEntitlements: Object.keys(customerInfo.entitlements.active),
                allEntitlements: Object.keys(customerInfo.entitlements.all),
            });

            // Check for the "ChessMaxx Pro" entitlement (or any active entitlement)
            // RevenueCat uses entitlement identifiers, not product IDs
            const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;

            if (hasActiveEntitlement) {
                console.log('[RevenueCat] Active entitlements found:', Object.keys(customerInfo.entitlements.active));
            } else {
                console.log('[RevenueCat] No active entitlements');
            }

            return hasActiveEntitlement;
        } catch (error) {
            console.error('[RevenueCat] Get status failed:', error);
            return false;
        }
    }

    private mapPackageToProduct(pkg: PurchasesPackage): Product {
        const { product } = pkg;
        return {
            id: product.identifier,
            title: product.title,
            description: product.description,
            price: product.priceString,
            priceAmountMicros: product.price * 1000000, // Approx
            currency: product.currencyCode,
            originalObject: pkg,
        };
    }
}
