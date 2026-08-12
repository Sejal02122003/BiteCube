import { FoodBusinessSettings } from '../models/businessSettings.model.js';
import { FoodToggleSettings } from '../models/toggleSettings.model.js';
import { sendResponse } from '../../../../utils/response.js';
import { deleteManagedUploadByUrl, setActiveUploadProvider, uploadGenericImage, uploadFileBuffer } from '../../../../services/upload.service.js';

const DEFAULT_TOGGLE_SETTINGS = {
    onlinePaymentOnly: false,
    maxCodAmount: 0,
    uploadProvider: 'system',
    maintenanceMode: false,
    customerRegistration: true,
    restaurantRegistration: true,
    deliveryRegistration: true
};

const normalizeUploadProvider = (value) => (
    String(value || DEFAULT_TOGGLE_SETTINGS.uploadProvider).trim().toLowerCase() === 'cloudinary'
        ? 'cloudinary'
        : 'system'
);

const buildTogglePayload = (settings = {}) => ({
    onlinePaymentOnly: Boolean(settings.onlinePaymentOnly),
    maxCodAmount: Number(settings.maxCodAmount) || 0,
    uploadProvider: normalizeUploadProvider(settings.uploadProvider),
    maintenanceMode: Boolean(settings.maintenanceMode),
    customerRegistration: settings.customerRegistration !== false,
    restaurantRegistration: settings.restaurantRegistration !== false,
    deliveryRegistration: settings.deliveryRegistration !== false
});

const getLegacyToggleValues = (businessSettings = {}) => ({
    onlinePaymentOnly: businessSettings.onlinePaymentOnly,
    maxCodAmount: businessSettings.maxCodAmount,
    uploadProvider: businessSettings.uploadProvider,
    maintenanceMode: businessSettings.maintenanceMode,
    customerRegistration: businessSettings.customerRegistration,
    restaurantRegistration: businessSettings.restaurantRegistration,
    deliveryRegistration: businessSettings.deliveryRegistration
});

const ensureToggleSettings = async (businessSettings = null) => {
    let toggleSettings = await FoodToggleSettings.findOne();
    if (toggleSettings) return toggleSettings;

    toggleSettings = await FoodToggleSettings.create({
        ...DEFAULT_TOGGLE_SETTINGS,
        ...buildTogglePayload(getLegacyToggleValues(businessSettings || {}))
    });
    setActiveUploadProvider(toggleSettings.uploadProvider);
    return toggleSettings;
};

const replaceManagedAsset = async (currentAsset, nextUrl) => {
    const previousUrl = String(currentAsset?.url || '').trim();
    const normalizedNextUrl = String(nextUrl || '').trim();

    if (previousUrl && normalizedNextUrl && previousUrl !== normalizedNextUrl) {
        await deleteManagedUploadByUrl(previousUrl);
    }

    return { url: normalizedNextUrl, publicId: null };
};

export async function getBusinessSettings(req, res, next) {
    try {
        let settings = await FoodBusinessSettings.findOne().lean();
        if (!settings) {
            // Create default settings if none exist
            settings = await FoodBusinessSettings.create({
                companyName: 'Bitecube',
                email: 'admin@bitecube.com'
            });
        }
        const toggleSettings = await ensureToggleSettings(settings);
        const payload = {
            ...settings,
            ...buildTogglePayload(toggleSettings.toObject ? toggleSettings.toObject() : toggleSettings)
        };
        return sendResponse(res, 200, 'Business settings fetched successfully', payload);
    } catch (error) {
        next(error);
    }
}

export async function updateBusinessSettings(req, res, next) {
    try {
        // Safer data parsing that handles both JSON and multipart/form-data
        let data = {};
        try {
            if (req.body.data) {
                data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
            } else {
                data = req.body;
            }
        } catch (err) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        const { 
            companyName, email, phoneCountryCode, phoneNumber, address, state, pincode, region,
            supportEmail, supportPhone, supportHours, fssai, gstin
        } = data;

        console.log("updateBusinessSettings req.files:", req.files ? Object.keys(req.files) : "none");
        console.log("updateBusinessSettings data keys:", Object.keys(data));

        // Ensure string inputs for validation to prevent crashes from non-string values
        const s_companyName = String(companyName || "").trim();
        const s_email = String(email || "").trim();
        const s_phoneNumber = String(phoneNumber || "").trim();
        const s_address = String(address || "").trim();
        const s_state = String(state || "").trim();
        const s_pincode = String(pincode || "").trim();
        const s_supportEmail = String(supportEmail || "").trim();
        const s_supportPhone = String(supportPhone || "").trim();
        const s_supportHours = String(supportHours || "").trim();
        const s_fssai = String(fssai || "").trim();
        const s_gstin = String(gstin || "").trim();

        // Validation (only if field is provided for partial updates)
        if (companyName !== undefined && (!s_companyName || s_companyName.length < 2 || s_companyName.length > 50)) {
            return res.status(400).json({ success: false, message: 'Company name must be between 2 and 50 characters' });
        }
        if (email !== undefined && (!s_email || s_email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s_email))) {
            return res.status(400).json({ success: false, message: 'Invalid email address (max 100 characters)' });
        }
        if (phoneNumber !== undefined && (!s_phoneNumber || !/^\d{7,15}$/.test(s_phoneNumber))) {
            return res.status(400).json({ success: false, message: 'Invalid phone number (7-15 digits required)' });
        }
        if (s_address && s_address.length > 250) {
            return res.status(400).json({ success: false, message: 'Address is too long (max 250 characters)' });
        }
        if (s_state && s_state.length > 50) {
            return res.status(400).json({ success: false, message: 'State name is too long (max 50 characters)' });
        }
        if (s_pincode && !/^\d{4,10}$/.test(s_pincode)) {
            return res.status(400).json({ success: false, message: 'Invalid pincode (4-10 digits required)' });
        }
        if (s_supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s_supportEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid support email address' });
        }

        let settings = await FoodBusinessSettings.findOne();
        if (!settings) {
            settings = new FoodBusinessSettings();
        }

        if (s_companyName) settings.companyName = s_companyName;
        if (s_email) settings.email = s_email;
        if (phoneCountryCode || s_phoneNumber) {
            settings.phone = {
                countryCode: String(phoneCountryCode || settings.phone?.countryCode || '+91').trim(),
                number: s_phoneNumber || settings.phone?.number || ''
            };
        }
        if (address !== undefined) settings.address = s_address;
        if (state !== undefined) settings.state = s_state;
        if (pincode !== undefined) settings.pincode = s_pincode;
        if (region) settings.region = String(region).trim();
        
        if (supportEmail !== undefined) settings.supportEmail = s_supportEmail;
        if (supportPhone !== undefined) settings.supportPhone = s_supportPhone;
        if (supportHours !== undefined) settings.supportHours = s_supportHours;
        if (fssai !== undefined) settings.fssai = s_fssai;
        if (gstin !== undefined) settings.gstin = s_gstin;
        // Handle file uploads
        if (req.files?.logo) {
            const logoUrl = await uploadGenericImage(req.files.logo[0].buffer, 'business/logos');
            settings.logo = await replaceManagedAsset(settings.logo, logoUrl);
        } else if (data.logo !== undefined) {
            settings.logo = await replaceManagedAsset(settings.logo, String(data.logo).trim());
        }

        if (req.files?.userLogo) {
            const userLogoUrl = await uploadGenericImage(req.files.userLogo[0].buffer, 'business/logos');
            settings.userLogo = await replaceManagedAsset(settings.userLogo, userLogoUrl);
        } else if (data.userLogo !== undefined) {
            settings.userLogo = await replaceManagedAsset(settings.userLogo, String(data.userLogo).trim());
        }

        if (req.files?.restaurantLogo) {
            const restaurantLogoUrl = await uploadGenericImage(req.files.restaurantLogo[0].buffer, 'business/logos');
            settings.restaurantLogo = await replaceManagedAsset(settings.restaurantLogo, restaurantLogoUrl);
        } else if (data.restaurantLogo !== undefined) {
            settings.restaurantLogo = await replaceManagedAsset(settings.restaurantLogo, String(data.restaurantLogo).trim());
        }

        if (req.files?.sellerLogo) {
            const sellerLogoUrl = await uploadGenericImage(req.files.sellerLogo[0].buffer, 'business/logos');
            settings.sellerLogo = await replaceManagedAsset(settings.sellerLogo, sellerLogoUrl);
        } else if (data.sellerLogo !== undefined) {
            settings.sellerLogo = await replaceManagedAsset(settings.sellerLogo, String(data.sellerLogo).trim());
        }

        if (req.files?.deliveryLogo) {
            const deliveryLogoUrl = await uploadGenericImage(req.files.deliveryLogo[0].buffer, 'business/logos');
            settings.deliveryLogo = await replaceManagedAsset(settings.deliveryLogo, deliveryLogoUrl);
        } else if (data.deliveryLogo !== undefined) {
            settings.deliveryLogo = await replaceManagedAsset(settings.deliveryLogo, String(data.deliveryLogo).trim());
        }

        if (req.files?.adminLogo) {
            const adminLogoUrl = await uploadGenericImage(req.files.adminLogo[0].buffer, 'business/logos');
            settings.adminLogo = await replaceManagedAsset(settings.adminLogo, adminLogoUrl);
        } else if (data.adminLogo !== undefined) {
            settings.adminLogo = await replaceManagedAsset(settings.adminLogo, String(data.adminLogo).trim());
        }

        if (req.files?.favicon) {
            const faviconUrl = await uploadGenericImage(req.files.favicon[0].buffer, 'business/favicons');
            settings.favicon = await replaceManagedAsset(settings.favicon, faviconUrl);
        } else if (data.favicon) {
            settings.favicon = await replaceManagedAsset(settings.favicon, String(data.favicon).trim());
        }

        if (req.files?.termsAndConditionsPdf) {
            const pdfFile = req.files.termsAndConditionsPdf[0];
            const pdfUrl = await uploadFileBuffer(pdfFile.buffer, 'business/legal', {
                fileName: pdfFile.originalname,
                format: 'pdf'
            });
            settings.termsAndConditionsPdf = await replaceManagedAsset(settings.termsAndConditionsPdf, pdfUrl);
        } else if (data.termsAndConditionsPdf) {
            settings.termsAndConditionsPdf = await replaceManagedAsset(settings.termsAndConditionsPdf, String(data.termsAndConditionsPdf).trim());
        }

        await settings.save();
        const toggleSettings = await ensureToggleSettings(settings);
        const payload = {
            ...(settings.toObject ? settings.toObject() : settings),
            ...buildTogglePayload(toggleSettings.toObject ? toggleSettings.toObject() : toggleSettings)
        };
        return sendResponse(res, 200, 'Business settings updated successfully', payload);
    } catch (error) {
        next(error);
    }
}

export async function updateBusinessToggles(req, res, next) {
    try {
        const {
            onlinePaymentOnly,
            maxCodAmount,
            uploadProvider,
            maintenanceMode,
            customerRegistration,
            restaurantRegistration,
            deliveryRegistration,
        } = req.body || {};

        const businessSettings = await FoodBusinessSettings.findOne().lean();
        const settings = await ensureToggleSettings(businessSettings);

        if (onlinePaymentOnly !== undefined) {
            settings.onlinePaymentOnly = Boolean(onlinePaymentOnly);
        }
        if (maxCodAmount !== undefined) {
            settings.maxCodAmount = Number(maxCodAmount) || 0;
        }
        if (uploadProvider !== undefined) {
            settings.uploadProvider = normalizeUploadProvider(uploadProvider);
            setActiveUploadProvider(settings.uploadProvider);
        }
        if (maintenanceMode !== undefined) {
            settings.maintenanceMode = Boolean(maintenanceMode);
        }
        if (customerRegistration !== undefined) {
            settings.customerRegistration = Boolean(customerRegistration);
        }
        if (restaurantRegistration !== undefined) {
            settings.restaurantRegistration = Boolean(restaurantRegistration);
        }
        if (deliveryRegistration !== undefined) {
            settings.deliveryRegistration = Boolean(deliveryRegistration);
        }

        await settings.save();
        const payload = {
            ...(businessSettings || {}),
            ...buildTogglePayload(settings.toObject ? settings.toObject() : settings)
        };
        return sendResponse(res, 200, 'Toggle settings updated successfully', payload);
    } catch (error) {
        next(error);
    }
}
