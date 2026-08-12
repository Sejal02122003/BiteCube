import mongoose from 'mongoose';

const geoPointSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: {
            type: [Number],
            default: undefined,
            validate: {
                validator(value) {
                    return (
                        !value ||
                        (Array.isArray(value) &&
                            value.length === 2 &&
                            value.every((item) => typeof item === 'number' && Number.isFinite(item)))
                    );
                },
                message: 'location.coordinates must be [lng, lat]'
            }
        },
        latitude: { type: Number },
        longitude: { type: Number },
        formattedAddress: { type: String, trim: true },
        addressLine1: { type: String, trim: true },
        addressLine2: { type: String, trim: true },
        area: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        landmark: { type: String, trim: true }
    },
    { _id: false }
);

const quickCommerceSellerSchema = new mongoose.Schema(
    {
        storeName: { type: String, required: true, trim: true },
        storeNameNormalized: { type: String, trim: true, index: true },
        slug: { type: String, trim: true, lowercase: true, index: true },
        ownerName: { type: String, required: true, trim: true },
        ownerEmail: { type: String, trim: true, lowercase: true, default: '' },
        ownerPhone: { type: String, required: true, trim: true },
        ownerPhoneDigits: { type: String, trim: true, index: true },
        ownerPhoneLast10: { type: String, trim: true, index: true },
        alternatePhone: { type: String, trim: true, default: '' },
        businessType: {
            type: String,
            enum: ['grocery', 'pharmacy', 'pet-store', 'meat-store', 'florist', 'general-store', 'other'],
            default: 'general-store'
        },
        description: { type: String, trim: true, default: '' },
        profileImage: { type: String, trim: true, default: '' },
        coverImage: { type: String, trim: true, default: '' },
        addressLine1: { type: String, trim: true, default: '' },
        addressLine2: { type: String, trim: true, default: '' },
        area: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: '' },
        state: { type: String, trim: true, default: '' },
        pincode: { type: String, trim: true, default: '' },
        landmark: { type: String, trim: true, default: '' },
        location: { type: geoPointSchema, default: undefined },
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodZone', index: true, default: undefined },
        panNumber: { type: String, trim: true, default: '' },
        gstRegistered: { type: Boolean, default: false },
        gstNumber: { type: String, trim: true, default: '' },
        fssaiNumber: { type: String, trim: true, default: '' },
        accountHolderName: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        ifscCode: { type: String, trim: true, default: '' },
        upiId: { type: String, trim: true, default: '' },
        documents: {
            panImage: { type: String, trim: true, default: '' },
            gstImage: { type: String, trim: true, default: '' },
            fssaiImage: { type: String, trim: true, default: '' },
            storeImage: { type: String, trim: true, default: '' },
            cancelledChequeImage: { type: String, trim: true, default: '' }
        },
        fcmTokens: { type: [String], default: [] },
        fcmTokenMobile: { type: [String], default: [] },
        isActive: { type: Boolean, default: true, index: true },
        isAcceptingOrders: { type: Boolean, default: true, index: true },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true
        },
        approvedAt: { type: Date },
        rejectedAt: { type: Date },
        rejectionReason: { type: String, trim: true, default: '' }
    },
    {
        collection: 'quick_commerce_sellers',
        timestamps: true
    }
);

quickCommerceSellerSchema.pre('validate', function normalizeSellerFields(next) {
    const storeName = typeof this.storeName === 'string' ? this.storeName.trim() : '';
    this.storeNameNormalized = storeName.toLowerCase().replace(/\s+/g, ' ') || undefined;
    this.slug =
        storeName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || undefined;

    const rawPhone =
        typeof this.ownerPhone === 'string' || typeof this.ownerPhone === 'number'
            ? String(this.ownerPhone)
            : '';
    const digits = rawPhone.replace(/\D/g, '').slice(-15);
    this.ownerPhoneDigits = digits || undefined;
    this.ownerPhoneLast10 = digits ? digits.slice(-10) : undefined;

    if (this.location) {
        const lat = typeof this.location.latitude === 'number' ? this.location.latitude : undefined;
        const lng = typeof this.location.longitude === 'number' ? this.location.longitude : undefined;
        if (
            (!Array.isArray(this.location.coordinates) || this.location.coordinates.length !== 2) &&
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {
            this.location.coordinates = [lng, lat];
        }

        if (Array.isArray(this.location.coordinates) && this.location.coordinates.length === 2) {
            const [storedLng, storedLat] = this.location.coordinates;
            if (!Number.isFinite(this.location.latitude) && Number.isFinite(storedLat)) {
                this.location.latitude = storedLat;
            }
            if (!Number.isFinite(this.location.longitude) && Number.isFinite(storedLng)) {
                this.location.longitude = storedLng;
            }
        }

        if (!this.location.addressLine1 && this.addressLine1) this.location.addressLine1 = this.addressLine1;
        if (!this.location.addressLine2 && this.addressLine2) this.location.addressLine2 = this.addressLine2;
        if (!this.location.area && this.area) this.location.area = this.area;
        if (!this.location.city && this.city) this.location.city = this.city;
        if (!this.location.state && this.state) this.location.state = this.state;
        if (!this.location.pincode && this.pincode) this.location.pincode = this.pincode;
        if (!this.location.landmark && this.landmark) this.location.landmark = this.landmark;
    }

    next();
});

quickCommerceSellerSchema.index({ storeName: 1 });
quickCommerceSellerSchema.index({ status: 1, createdAt: -1 });
quickCommerceSellerSchema.index({ location: '2dsphere' });
quickCommerceSellerSchema.index(
    { storeNameNormalized: 1, ownerPhoneLast10: 1 },
    {
        unique: true,
        partialFilterExpression: {
            storeNameNormalized: { $type: 'string' },
            ownerPhoneLast10: { $type: 'string' }
        }
    }
);

export const QuickCommerceSeller = mongoose.model('QuickCommerceSeller', quickCommerceSellerSchema);
