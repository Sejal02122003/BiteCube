import mongoose from 'mongoose';

const foodDeliveryWithdrawalSchema = new mongoose.Schema({
    deliveryPartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodDeliveryPartner',
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
    upiId: String,
    upiQrCode: String,
    adminNote: String,
    rejectionReason: String,
    transactionId: String, // Final bank transaction reference from admin
    processedAt: Date
}, { 
    collection: 'payment_food_delivery_withdrawals', 
    timestamps: true 
});

foodDeliveryWithdrawalSchema.virtual('amount').get(function getAmount() { return this.amountPaise / 100; });

foodDeliveryWithdrawalSchema.index({ createdAt: -1 });

export const FoodDeliveryWithdrawal = mongoose.model('FoodDeliveryWithdrawal', foodDeliveryWithdrawalSchema);
