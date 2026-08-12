import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/env.js';

// Ensure the single upload directory exists.
const baseUploadDir = config.uploadPath || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
}

const ensureUploadDirExists = () => {
    if (!fs.existsSync(baseUploadDir)) {
        fs.mkdirSync(baseUploadDir, { recursive: true });
    }
    return baseUploadDir;
};

const uploadIndexCache = {
    expiresAt: 0,
    files: new Map()
};

const UPLOAD_INDEX_TTL_MS = 30 * 1000;
const supportedUploadExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.pdf', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.bin'];

const getUploadFilesIndex = () => {
    const now = Date.now();
    if (uploadIndexCache.expiresAt > now && uploadIndexCache.files.size > 0) {
        return uploadIndexCache.files;
    }

    const dir = ensureUploadDirExists();
    const nextFiles = new Map();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        nextFiles.set(entry.name.toLowerCase(), entry.name);
    }

    uploadIndexCache.files = nextFiles;
    uploadIndexCache.expiresAt = now + UPLOAD_INDEX_TTL_MS;
    return uploadIndexCache.files;
};

const normalizeUploadToken = (value, fallback = 'upload') => {
    const normalized = String(value || fallback)
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    return normalized || fallback;
};

const buildFlatUploadFilename = ({ prefix = 'file', extension = '' }) => {
    const normalizedPrefix = normalizeUploadToken(prefix, 'file');
    const normalizedExtension = extension
        ? `.${String(extension).replace(/^\.+/, '').toLowerCase()}`
        : '';

    return `${normalizedPrefix}_${uuidv4().replace(/-/g, '').substring(0, 10)}${normalizedExtension}`;
};

const getActiveUploadProvider = () => {
    return String(config.uploadProvider || 'local').trim().toLowerCase() === 'cloudinary'
        ? 'cloudinary'
        : 'local';
};

const getCloudinaryCredentials = () => {
    const cloudName = String(config.cloudinaryCloudName || '').trim();
    const apiKey = String(config.cloudinaryApiKey || '').trim();
    const apiSecret = String(config.cloudinaryApiSecret || '').trim();

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is selected but credentials are missing. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }

    return { cloudName, apiKey, apiSecret };
};

const signCloudinaryParams = (params = {}, apiSecret = '') => {
    const serialized = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return crypto
        .createHash('sha1')
        .update(`${serialized}${apiSecret}`)
        .digest('hex');
};

const uploadToCloudinary = async (buffer, folder, { resourceType = 'image', fileName = 'file' } = {}) => {
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = buildFlatUploadFilename({
        prefix: normalizeUploadToken(fileName, resourceType),
        extension: ''
    });

    const signatureParams = {
        folder: folder || undefined,
        public_id: publicId,
        timestamp
    };

    const signature = signCloudinaryParams(signatureParams, apiSecret);
    const formData = new FormData();
    formData.append('file', new Blob([buffer]));
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('public_id', publicId);
    if (folder) {
        formData.append('folder', folder);
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message || 'Cloudinary upload failed');
    }

    return payload?.secure_url || payload?.url || '';
};

// Multer memory storage
const storage = multer.memoryStorage();

// File filter (from SOP: jpeg, png, webp, gif, plus pdf for T&C, plus icons for favicon)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
        'application/pdf', 'image/x-icon', 'image/vnd.microsoft.icon'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, ICO, and PDF are allowed.'), false);
    }
};

// Multer middleware: max 5MB (from SOP) for specific image endpoints
export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter
});

/**
 * Processes and saves an image buffer to the single upload directory.
 * Returns the relative public path (e.g., '/uploads/food_123.webp')
 */
const processAndSaveImage = async ({ buffer, prefix, width, height, quality = 80 }) => {
    const dir = ensureUploadDirExists();
    const filename = buildFlatUploadFilename({ prefix, extension: 'webp' });
    const filepath = path.join(dir, filename);

    let sharpInstance = sharp(buffer);

    if (width || height) {
        sharpInstance = sharpInstance.resize({
            width,
            height,
            fit: 'inside',
            withoutEnlargement: true
        });
    }

    await sharpInstance
        .webp({ quality })
        .toFile(filepath);

    return `/uploads/${filename}`;
};

const processAndUploadImage = async ({ buffer, folder = 'misc', prefix, width, height, quality = 80 }) => {
    if (getActiveUploadProvider() === 'cloudinary') {
        const transformedBuffer = await sharp(buffer)
            .resize(width || null, height || null, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality })
            .toBuffer();

        return uploadToCloudinary(transformedBuffer, folder, {
            resourceType: 'image',
            fileName: `${prefix || 'image'}.webp`
        });
    }

    return processAndSaveImage({ buffer, prefix, width, height, quality });
};

/**
 * Exported specific processing functions as per SOP
 */

export const uploadFoodImage = async (buffer) => {
    return processAndUploadImage({
        buffer,
        folder: 'foods',
        prefix: 'food',
        width: 800,
        height: 800,
        quality: 85
    });
};

export const uploadRestaurantImage = async (buffer) => {
    return processAndUploadImage({
        buffer,
        folder: 'restaurants',
        prefix: 'restaurant',
        width: 1200,
        height: 800,
        quality: 85
    });
};

export const uploadBannerImage = async (buffer) => {
    return processAndUploadImage({
        buffer,
        folder: 'banners',
        prefix: 'banner',
        width: 1600,
        height: 600,
        quality: 85
    });
};

export const uploadProfileImage = async (buffer) => {
    return processAndUploadImage({
        buffer,
        folder: 'users',
        prefix: 'user',
        width: 400,
        height: 400,
        quality: 85
    });
};

export const uploadDeliveryImage = async (buffer) => {
    return processAndUploadImage({
        buffer,
        folder: 'delivery',
        prefix: 'delivery',
        width: 800,
        height: 800,
        quality: 85
    });
};

export const uploadGenericImage = async (buffer, _folder = 'misc') => {
    return processAndUploadImage({
        buffer,
        folder: _folder,
        prefix: 'img',
        quality: 85
    });
};

export const uploadFileBuffer = async (buffer, _folder = 'misc', options = {}) => {
    if (getActiveUploadProvider() === 'cloudinary') {
        return uploadToCloudinary(buffer, _folder, {
            resourceType: 'raw',
            fileName: options.fileName || 'file'
        });
    }

    const dir = ensureUploadDirExists();
    const prefix = normalizeUploadToken(options.fileName ? options.fileName.split('.')[0] : 'file', 'file');
    const filename = buildFlatUploadFilename({
        prefix,
        extension: options.format || 'bin'
    });
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
};

export const uploadVideoBuffer = async (buffer, _folder = 'videos', options = {}) => {
    if (getActiveUploadProvider() === 'cloudinary') {
        return uploadToCloudinary(buffer, _folder, {
            resourceType: 'video',
            fileName: options.fileName || `video.${options.format || 'mp4'}`
        });
    }

    const dir = ensureUploadDirExists();
    const filename = buildFlatUploadFilename({
        prefix: 'video',
        extension: options.format ? normalizeUploadToken(options.format, 'mp4') : 'mp4'
    });
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
};

export const buildRawDownloadUrlFromFileUrl = (fileUrl, options = {}) => {
    return fileUrl;
};

export const normalizeStoredUploadPath = (value) => {
    if (value === null || value === undefined) return '';

    const trimmed = String(value).trim();
    if (!trimmed) return '';

    const externalSchemes = ['http://', 'https://'];
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

    if (externalSchemes.some((prefix) => trimmed.startsWith(prefix))) {
        try {
            const url = new URL(trimmed);
            if (!localHosts.has(url.hostname)) {
                return trimmed;
            }
            const localPath = url.pathname || '';
            return normalizeStoredUploadPath(localPath);
        } catch {
            return trimmed;
        }
    }

    const normalized = trimmed
        .split('?')[0]
        .split('#')[0]
        .replace(/\\/g, '/');

    const filename = path.posix.basename(normalized);
    if (!filename || filename === '.' || filename === '/') return '';

    return `/uploads/${filename}`;
};

export const resolveStoredUploadPath = (value) => {
    const normalized = normalizeStoredUploadPath(value);
    if (!normalized) return '';
    if (/^https?:\/\//i.test(String(value || '').trim())) return String(value).trim();

    const filename = path.posix.basename(normalized);
    if (!filename) return normalized;

    const uploadFiles = getUploadFilesIndex();
    const parsed = path.posix.parse(filename);
    const stem = parsed.name.toLowerCase();
    if (!stem) return normalized;

    const webpCandidate = uploadFiles.get(`${stem}.webp`);
    if (webpCandidate) {
        return `/uploads/${webpCandidate}`;
    }

    const exact = uploadFiles.get(filename.toLowerCase());
    if (exact) {
        return `/uploads/${exact}`;
    }

    for (const ext of supportedUploadExtensions) {
        const candidate = uploadFiles.get(`${stem}${ext}`);
        if (candidate) {
            return `/uploads/${candidate}`;
        }
    }

    const prefixMatches = Array.from(uploadFiles.entries())
        .filter(([lowerName]) => {
            const parsedName = path.posix.parse(lowerName);
            return parsedName.name === stem || parsedName.name.startsWith(`${stem}_`);
        })
        .map(([, actualName]) => actualName)
        .sort((a, b) => {
            const aExt = path.posix.extname(a).toLowerCase();
            const bExt = path.posix.extname(b).toLowerCase();
            const aRank = supportedUploadExtensions.indexOf(aExt);
            const bRank = supportedUploadExtensions.indexOf(bExt);
            if (aRank !== bRank) return aRank - bRank;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

    if (prefixMatches.length > 0) {
        return `/uploads/${prefixMatches[0]}`;
    }

    return normalized;
};

// --- Generic Production-Ready File Upload System ---

const genericStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, ensureUploadDirExists());
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        const name = normalizeUploadToken(path.basename(file.originalname, ext), file.mimetype.split('/')[0] || 'file');
        const normalizedExt = ext ? ext.replace(/^\.+/, '').toLowerCase() : '';
        cb(null, buildFlatUploadFilename({ prefix: name, extension: normalizedExt }));
    }
});

const genericFileFilter = (req, file, cb) => {
    const allowed = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm',
        'application/pdf'
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, and PDFs are supported.`), false);
    }
};

export const genericUpload = multer({
    storage: genericStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: genericFileFilter
});

