import mongoose from 'mongoose';

const toggleSettingsSchema = new mongoose.Schema(
    {
        onlinePaymentOnly: { type: Boolean, default: false },
        maxCodAmount: { type: Number, default: 0 },
        uploadProvider: {
            type: String,
            enum: ['system', 'cloudinary'],
            default: 'system'
        },
        maintenanceMode: { type: Boolean, default: false },
        customerRegistration: { type: Boolean, default: true },
        restaurantRegistration: { type: Boolean, default: true },
        deliveryRegistration: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export const FoodToggleSettings = mongoose.model('FoodToggleSettings', toggleSettingsSchema);
