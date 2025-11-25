import * as InAppPurchases from 'expo-in-app-purchases';
import { IAPAdapter, Product, Purchase } from './types';

export class StoreKitAdapter implements IAPAdapter {
    private initialized = false;

    async initialize(): Promise<boolean> {
        try {
            if (this.initialized) return true;

            await InAppPurchases.connectAsync();
            this.initialized = true;
            console.log('[StoreKit] Initialized successfully');
            return true;
        } catch (error: any) {
            if (error.message?.includes('Already connected')) {
                this.initialized = true;
                return true;
            }
            console.error('[StoreKit] Initialization failed:', error);
            return false;
        }
    }

    async getProducts(productIds: string[]): Promise<Product[]> {
        try {
            const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);

            if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results) {
                throw new Error(`Failed to fetch products: ${responseCode}`);
            }

            return results.map(this.mapIAPProductToProduct);
        } catch (error) {
            console.error('[StoreKit] Error fetching products:', error);
            throw error;
        }
    }

    async purchase(productId: string): Promise<Purchase> {
        try {
            await InAppPurchases.purchaseItemAsync(productId);

            // Polling logic similar to original context
            const maxAttempts = 30;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                const history = await InAppPurchases.getPurchaseHistoryAsync();
                if (history?.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
                    const purchase = history.results.find((p: any) => p.productId === productId);

                    if (purchase) {
                        if (!purchase.acknowledged) {
                            await InAppPurchases.finishTransactionAsync(purchase, false);
                        }
                        return {
                            productId: purchase.productId,
                            transactionId: purchase.orderId || 'unknown',
                            transactionDate: purchase.purchaseTime,
                            originalObject: purchase,
                        };
                    }
                }
            }
            throw new Error('Purchase timeout');
        } catch (error: any) {
            if (error.code === 'E_USER_CANCELLED') {
                throw new Error('User cancelled');
            }
            throw error;
        }
    }

    async restore(): Promise<Purchase[]> {
        try {
            const history = await InAppPurchases.getPurchaseHistoryAsync();
            if (history?.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
                return history.results.map((p: any) => ({
                    productId: p.productId,
                    transactionId: p.orderId || 'restored',
                    transactionDate: p.purchaseTime,
                    originalObject: p,
                }));
            }
            return [];
        } catch (error) {
            console.error('[StoreKit] Restore failed:', error);
            throw error;
        }
    }

    async getSubscriptionStatus(productIds: string[]): Promise<boolean> {
        try {
            const history = await InAppPurchases.getPurchaseHistoryAsync();
            if (history?.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
                return history.results.some((p: any) => productIds.includes(p.productId));
            }
            return false;
        } catch (error) {
            console.error('[StoreKit] Get status failed:', error);
            return false;
        }
    }

    private mapIAPProductToProduct(p: any): Product {
        return {
            id: p.productId,
            title: p.title,
            description: p.description,
            price: p.price,
            priceAmountMicros: p.priceAmountMicros,
            currency: p.currency,
            originalObject: p,
        };
    }
}
