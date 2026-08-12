import { ValidationError } from '../core/auth/errors.js';
import { sendSuccess } from '../utils/response.js';
import path from 'path';
import { uploadFileBuffer, uploadGenericImage, uploadVideoBuffer } from '../services/upload.service.js';

const buildFileData = (file, fileUrl) => ({
    filename: path.posix.basename(new URL(fileUrl, 'http://localhost').pathname || file.originalname || 'file'),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: fileUrl,
    url: fileUrl
});

const persistUploadedFile = async (file) => {
    if (!file?.buffer) {
        throw new ValidationError('No file buffer available for upload.');
    }

    const fileName = file.originalname || 'file';
    if ((file.mimetype || '').startsWith('image/')) {
        return uploadGenericImage(file.buffer, 'generic-images');
    }
    if ((file.mimetype || '').startsWith('video/')) {
        return uploadVideoBuffer(file.buffer, 'generic-videos', {
            fileName,
            format: path.extname(fileName).replace(/^\./, '') || 'mp4'
        });
    }

    return uploadFileBuffer(file.buffer, 'generic-files', {
        fileName,
        format: path.extname(fileName).replace(/^\./, '') || 'bin'
    });
};

export const uploadSingle = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ValidationError('No file provided or invalid file format.');
        }

        const fileUrl = await persistUploadedFile(req.file);
        const fileData = buildFileData(req.file, fileUrl);

        return sendSuccess(res, {
            success: true,
            file: fileData
        });
    } catch (error) {
        next(error);
    }
};

export const uploadMultiple = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            throw new ValidationError('No files provided or invalid formats.');
        }

        const filesData = await Promise.all(
            req.files.map(async (file) => {
                const fileUrl = await persistUploadedFile(file);
                return buildFileData(file, fileUrl);
            })
        );

        return sendSuccess(res, {
            success: true,
            files: filesData
        });
    } catch (error) {
        next(error);
    }
};
