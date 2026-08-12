import mongoose from 'mongoose';
import { logger } from '../../../../utils/logger.js';

let migrationPromise = null;

export const migrateLegacyToggleFields = async () => {
    if (migrationPromise) return migrationPromise;

    migrationPromise = (async () => {
        try {
            const db = mongoose.connection.db;
            if (!db) return;

            const businessCollection = db.collection('foodbusinesssettings');
            const toggleCollection = db.collection('foodtogglesettings');

            const existingToggleCount = await toggleCollection.countDocuments();
            if (existingToggleCount === 0) {
                const legacyBusiness = await businessCollection.findOne(
                    {},
                    {
                        projection: {
                            onlinePaymentOnly: 1,
                            maxCodAmount: 1,
                            uploadProvider: 1,
                            maintenanceMode: 1,
                            customerRegistration: 1,
                            restaurantRegistration: 1,
                            deliveryRegistration: 1,
                        }
                    }
                );

                await toggleCollection.insertOne({
                    onlinePaymentOnly: Boolean(legacyBusiness?.onlinePaymentOnly),
                    maxCodAmount: Number(legacyBusiness?.maxCodAmount) || 0,
                    uploadProvider: String(legacyBusiness?.uploadProvider || 'system').trim().toLowerCase() === 'cloudinary'
                        ? 'cloudinary'
                        : 'system',
                    maintenanceMode: Boolean(legacyBusiness?.maintenanceMode),
                    customerRegistration: legacyBusiness?.customerRegistration !== false,
                    restaurantRegistration: legacyBusiness?.restaurantRegistration !== false,
                    deliveryRegistration: legacyBusiness?.deliveryRegistration !== false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                logger.info('[ToggleMigration] Created initial FoodToggleSettings document from legacy business settings');
            }

            const cleanupResult = await businessCollection.updateMany(
                {},
                {
                    $unset: {
                        onlinePaymentOnly: '',
                        maxCodAmount: '',
                        uploadProvider: '',
                        maintenanceMode: '',
                        customerRegistration: '',
                        restaurantRegistration: '',
                        deliveryRegistration: ''
                    }
                }
            );

            logger.info(
                `[ToggleMigration] Legacy toggle fields cleanup completed: matched=${cleanupResult.matchedCount} modified=${cleanupResult.modifiedCount}`
            );
        } catch (error) {
            logger.error(`[ToggleMigration] Failed: ${error.message}`);
        }
    })();

    return migrationPromise;
};
