import mongoose from 'mongoose';

const quickHeroBannerSchema = new mongoose.Schema(
    {
        imageUrl: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            default: null
        },
        title: {
            type: String,
            default: ''
        },
        ctaText: {
            type: String,
            default: ''
        },
        ctaLink: {
            type: String,
            default: ''
        },
        sortOrder: {
            type: Number,
            default: 0,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        collection: 'quick_hero_banners',
        timestamps: true
    }
);

quickHeroBannerSchema.index({ isActive: 1, sortOrder: 1 });

export const QuickHeroBanner = mongoose.model('QuickHeroBanner', quickHeroBannerSchema);
