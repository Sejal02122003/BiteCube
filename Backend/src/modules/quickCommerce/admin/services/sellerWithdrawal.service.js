import mongoose from 'mongoose';
import { QuickCommerceSellerWithdrawal } from '../../seller/models/sellerWithdrawal.model.js';

export async function getQuickSellerWithdrawalsService(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 500);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.status && String(query.status).toLowerCase() !== 'all') {
        filter.status = String(query.status).toLowerCase();
    }
    if (query.sellerId && mongoose.Types.ObjectId.isValid(query.sellerId)) {
        filter.sellerId = new mongoose.Types.ObjectId(query.sellerId);
    }

    const [withdrawals, total] = await Promise.all([
        QuickCommerceSellerWithdrawal.find(filter)
            .populate('sellerId', 'storeName ownerName ownerPhone addressLine1 addressLine2 area city state pincode landmark accountHolderName accountNumber ifscCode upiId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        QuickCommerceSellerWithdrawal.countDocuments(filter)
    ]);

    const search = String(query.search || '').trim().toLowerCase();

    const requests = withdrawals
        .map((withdrawal) => {
            const seller = withdrawal.sellerId || {};
            const sellerAddress = [
                seller.addressLine1,
                seller.addressLine2,
                seller.area,
                seller.city,
                seller.state,
                seller.pincode
            ]
                .filter(Boolean)
                .join(', ');

            return {
                ...withdrawal,
                id: withdrawal._id,
                sellerName: seller.storeName || 'N/A',
                sellerIdString: seller?._id ? `SELL${String(seller._id).slice(-6).padStart(6, '0')}` : 'N/A',
                sellerAddress: sellerAddress || seller.landmark || 'N/A',
                sellerBankDetails: {
                    accountHolderName: withdrawal.bankDetails?.accountHolderName || seller.accountHolderName || '',
                    accountNumber: withdrawal.bankDetails?.accountNumber || seller.accountNumber || '',
                    ifscCode: withdrawal.bankDetails?.ifscCode || seller.ifscCode || '',
                    bankName: withdrawal.bankDetails?.bankName || '',
                    upiId: withdrawal.bankDetails?.upiId || seller.upiId || ''
                },
                status: withdrawal.status ? withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1) : 'Pending'
            };
        })
        .filter((item) => {
            if (!search) return true;
            return (
                item.sellerName?.toLowerCase().includes(search) ||
                item.sellerIdString?.toLowerCase().includes(search) ||
                String(item.amount || '').includes(search)
            );
        });

    return { requests, total: search ? requests.length : total, page, limit };
}

export async function updateQuickSellerWithdrawalStatusService(
    id,
    { status, adminNote, rejectionReason, transactionId }
) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid withdrawal ID');
    }

    const normalizedStatus = String(status || '').toLowerCase();
    if (!['approved', 'processed', 'rejected', 'pending'].includes(normalizedStatus)) {
        throw new Error('Invalid withdrawal status');
    }

    const update = {
        status: normalizedStatus,
        adminNote: adminNote || '',
        rejectionReason: rejectionReason || '',
        transactionId: transactionId || '',
        processedAt: normalizedStatus === 'pending' ? null : new Date()
    };

    const updated = await QuickCommerceSellerWithdrawal.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
    )
        .populate('sellerId', 'storeName ownerPhone')
        .lean();

    if (!updated) {
        throw new Error('Withdrawal request not found');
    }

    return updated;
}
