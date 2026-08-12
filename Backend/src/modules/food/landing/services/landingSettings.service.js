import { FoodLandingSettings } from '../models/landingSettings.model.js';

export const getLandingSettings = async () => {
    let doc = await FoodLandingSettings.findOne().sort({ _id: 1 }).lean();
    if (!doc) {
        doc = (await FoodLandingSettings.create({})).toObject();
    }
    return doc;
};

export const updateLandingSettings = async (payload) => {
    let doc = await FoodLandingSettings.findOne().sort({ _id: 1 });
    if (!doc) {
        doc = await FoodLandingSettings.create(payload);
    } else {
        Object.assign(doc, payload);
        await doc.save();
    }
    return doc.toObject ? doc.toObject() : doc;
};
