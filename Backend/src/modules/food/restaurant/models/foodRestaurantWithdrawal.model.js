import mongoose from 'mongoose';

const foodRestaurantWithdrawalSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodRestaurant',
        required: true,
        index: true
    },
    amountPaise: {
        type: Number,
        required: true,
        min: [1, 'Minimum withdrawal amount is ₹1']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    paymentMethod: {
        type: String,
        default: 'bank_transfer'
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        accountHolderName: String
    },
    adminNote: String,
    rejectionReason: String,
    transactionId: String, // Final bank transaction reference from admin
    processedAt: Date
}, { 
    collection: 'payment_food_restaurant_withdrawals', 
    timestamps: true 
});

foodRestaurantWithdrawalSchema.virtual('amount').get(function getAmount() { return this.amountPaise / 100; });

foodRestaurantWithdrawalSchema.index({ createdAt: -1 });

export const FoodRestaurantWithdrawal = mongoose.model('FoodRestaurantWithdrawal', foodRestaurantWithdrawalSchema);
