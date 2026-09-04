import mongoose from 'mongoose';

const ORDER_COLLECTIONS = ['food_orders', 'quick_commerce_orders'];
const FINANCIAL_COLLECTIONS = [
  'payment_food_transactions', 'payment_quick_commerce_transactions', 'payment_wallet_transactions', 'payment_payments', 'payment_refunds', 'payment_settlements',
  'payment_processed_webhook_events', 'payment_food_order_payments',
  'payment_food_delivery_withdrawals', 'payment_food_restaurant_withdrawals',
  'payment_food_delivery_bonus_transactions', 'payment_quick_commerce_seller_withdrawals',
];
const WALLET_COLLECTIONS = [
  'payment_user_wallets', 'payment_food_restaurant_wallets', 'payment_delivery_wallets',
  'payment_food_admin_wallets', 'payment_quick_commerce_seller_wallets',
];

export async function resetDeveloperData(confirmation) {
  if (String(confirmation || '') !== 'CLEAR ALL DATA') {
    const error = new Error('Type CLEAR ALL DATA to confirm this reset');
    error.statusCode = 400;
    throw error;
  }
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database is not connected');
  const result = { ordersDeleted: 0, financialRecordsDeleted: 0, walletsReset: 0 };
  for (const name of ORDER_COLLECTIONS) {
    const response = await db.collection(name).deleteMany({});
    result.ordersDeleted += response.deletedCount || 0;
  }
  for (const name of FINANCIAL_COLLECTIONS) {
    const response = await db.collection(name).deleteMany({});
    result.financialRecordsDeleted += response.deletedCount || 0;
  }
  for (const name of WALLET_COLLECTIONS) {
    const response = await db.collection(name).updateMany({}, {
      $set: { balance: 0, balancePaise: 0, lockedAmount: 0, transactions: [], totalEarnings: 0, totalRevenue: 0 },
    });
    result.walletsReset += response.modifiedCount || 0;
  }
  return result;
}
