const path = require('path');
const fs = require('fs');

class GalleryController {
    constructor() {
        this.uploadsPath = path.join(__dirname, '../../Gallery');
        this.metadataPath = path.join(this.uploadsPath, 'gallerymetadata.json');
    }

    // Initialize gallery directories and manifest
    initializeGallery() {
        const directories = ['Pictures', 'Videos'];
        
        directories.forEach(dir => {
            const dirPath = path.join(this.uploadsPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });

        // Create main uploads directory if it doesn't exist
        if (!fs.existsSync(this.uploadsPath)) {
            fs.mkdirSync(this.uploadsPath, { recursive: true });
        }

        // Initialize metadata file if it doesn't exist
        if (!fs.existsSync(this.metadataPath)) {
            this.saveMetadata({});
        }
    }


    // Helper to load metadata (array)
    loadMetadata() {
        if (!fs.existsSync(this.metadataPath)) return [];
        try {
            const raw = fs.readFileSync(this.metadataPath, 'utf8');
            if (raw.trim()) return JSON.parse(raw);
        } catch {}
        return [];
    }

    // Helper to save metadata (array)
    saveMetadata(metaArr) {
        fs.writeFileSync(this.metadataPath, JSON.stringify(metaArr, null, 2));
    }

    // --- HANDLERS ---
    async handleUpload(req, res, io) {
        const tokenEncryption = require('../../middleware/tokenEncryption');
        try {
            if (!req.body.encryptedData) {
                return res.status(400).json({ error: 'Missing encryptedData in request.' });
            }
            let encryptedData = req.body.encryptedData;
            if (typeof encryptedData === 'string') {
                try { encryptedData = JSON.parse(encryptedData); } catch (e) { return res.status(400).json({ error: 'Invalid encryptedData format' }); }
            }
            let decryptedMeta = null;
            try { decryptedMeta = tokenEncryption.decryptRequestData(encryptedData); } catch (e) { return res.status(400).json({ error: 'Failed to decrypt metadata.' }); }
            if (!decryptedMeta || !decryptedMeta.success) {
                return res.status(400).json({ error: 'Invalid encrypted metadata.' });
            }
            const metadata = decryptedMeta.data;
            const files = req.files || [];
            let galleryMeta = this.loadMetadata();
            const now = new Date().toISOString();
            for (const file of files) {
                galleryMeta.push({
                    action: 'upload',
                    fileName: file.originalname,
                    memberId: metadata.data.memberId || (metadata.data.uploadedBy && metadata.data.uploadedBy.id) || null,
                    role: metadata.data.role || (metadata.data.uploadedBy && metadata.data.uploadedBy.role) || null,
                    timestamp: now
                });
            }
            this.saveMetadata(galleryMeta);
            // Move files to correct subfolder
            let subfolder = 'Others';
            if (metadata.data.type === 'pictures') subfolder = 'Pictures';
            else if (metadata.data.type === 'videos') subfolder = 'Videos';
            const destDir = path.join(this.uploadsPath, subfolder);
            const videoThumbnails = {};
            for (const file of files) {
                const destPath = path.join(destDir, file.originalname);
                const parentDir = path.dirname(destPath);
                if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
                try {
                    fs.renameSync(file.path, destPath);
                    if (file.originalname.toLowerCase().endsWith('.mov')) {
                        const thumbPath = destPath + '.thumb.jpg';
                        const ffmpeg = require('child_process');
                        try {
                            ffmpeg.execSync(`ffmpeg -y -i "${destPath}" -frames:v 1 -q:v 2 "${thumbPath}"`);
                            if (fs.existsSync(thumbPath)) {
                                const thumbBuffer = fs.readFileSync(thumbPath);
                                videoThumbnails[file.originalname] = 'data:image/jpeg;base64,' + thumbBuffer.toString('base64');
                                fs.unlinkSync(thumbPath);
                            }
                        } catch (ffErr) { console.error(`[Gallery Upload] ffmpeg thumbnail error for ${file.originalname}:`, ffErr); }
                    }
                } catch {}
            }
            if (Object.keys(videoThumbnails).length > 0) {
                const thumbMetaPath = path.join(destDir, 'videoThumbnails.json');
                let existingThumbs = {};
                if (fs.existsSync(thumbMetaPath)) {
                    try { existingThumbs = JSON.parse(fs.readFileSync(thumbMetaPath)); } catch {}
                }
                Object.assign(existingThumbs, videoThumbnails);
                fs.writeFileSync(thumbMetaPath, JSON.stringify(existingThumbs));
            }
            if (io) io.emit('survey-updated', { message: 'Survey updated successfully' });
            return res.json({ result: { success: true, message: `Saved ${files.length} file(s) to ${subfolder}` } });
        } catch (error) {
            console.error('Error handling gallery upload:', error);
            return res.status(500).json({ error: 'Failed to handle gallery upload.' });
        }
    }

    async handleRetrieve(req, res) {
        try {
            const allowed = ['Pictures', 'Videos'];
            const subfolders = allowed;
            let allFiles = [];
            let galleryMeta = this.loadMetadata();
            const fileMetaMap = {};
            for (const entry of galleryMeta) {
                if (entry.action === 'upload') fileMetaMap[entry.fileName] = { memberId: entry.memberId, role: entry.role, approved: entry.approved };
                if (entry.action === 'approve') { if (fileMetaMap[entry.fileName]) fileMetaMap[entry.fileName].approved = true; }
                if (entry.action === 'reject') { if (fileMetaMap[entry.fileName]) fileMetaMap[entry.fileName].approved = false; }
                if (entry.action === 'delete') { if (fileMetaMap[entry.fileName]) delete fileMetaMap[entry.fileName]; }
            }
            let userRole = null, userId = null;
            if (req.headers['x-user-role']) userRole = req.headers['x-user-role'];
            if (req.headers['x-user-id']) userId = req.headers['x-user-id'];
            for (const sub of subfolders) {
                const dir = path.join(this.uploadsPath, sub);
                let videoThumbnails = {};
                const thumbMetaPath = path.join(dir, 'videoThumbnails.json');
                if (fs.existsSync(thumbMetaPath)) {
                    try { videoThumbnails = JSON.parse(fs.readFileSync(thumbMetaPath)); } catch {}
                }
                if (fs.existsSync(dir)) {
                    const subFiles = fs.readdirSync(dir).filter(filename => !filename.startsWith('.') && filename !== '.gitkeep' && !filename.endsWith('.thumb.jpg') && filename !== 'videoThumbnails.json');
                    for (const filename of subFiles) {
                        const filePath = path.join(dir, filename);
                        const fileBuffer = fs.readFileSync(filePath);
                        const base64Data = fileBuffer.toString('base64');
                        let thumbnailUrl = undefined;
                        if (filename.toLowerCase().endsWith('.mov')) {
                            if (videoThumbnails[filename]) thumbnailUrl = videoThumbnails[filename];
                        }
                        const meta = fileMetaMap[filename] || {};
                        if (userRole === 'WWF-Volunteer') {
                            if (meta.approved === true || (userId && meta.memberId === userId)) {
                                allFiles.push({
                                    name: filename,
                                    type: sub.toLowerCase(),
                                    data: base64Data,
                                    thumbnailUrl,
                                    memberId: meta.memberId || null,
                                    role: meta.role || null,
                                    approved: typeof meta.approved === 'boolean' ? meta.approved : null
                                });
                            }
                        } else {
                            allFiles.push({
                                name: filename,
                                type: sub.toLowerCase(),
                                data: base64Data,
                                thumbnailUrl,
                                memberId: meta.memberId || null,
                                role: meta.role || null,
                                approved: typeof meta.approved === 'boolean' ? meta.approved : null
                            });
                        }
                    }
                }
            }
            return res.json({ files: allFiles });
        } catch (error) {
            console.error('Error retrieving gallery files:', error);
            return res.status(500).json({ error: 'Failed to retrieve gallery files.' });
        }
    }

    async handleDelete(req, res, io) {
        const tokenEncryption = require('../../middleware/tokenEncryption');
        try {
            if (!req.body.encryptedData) {
                return res.status(400).json({ error: 'Missing encryptedData in request.' });
            }
            let encryptedData = req.body.encryptedData;
            if (typeof encryptedData === 'string') {
                try { encryptedData = JSON.parse(encryptedData); } catch (e) { return res.status(400).json({ error: 'Invalid encryptedData format' }); }
            }
            let decryptedMeta = null;
            try { decryptedMeta = tokenEncryption.decryptRequestData(encryptedData); } catch (e) { return res.status(400).json({ error: 'Failed to decrypt metadata.' }); }
            if (!decryptedMeta || !decryptedMeta.success) {
                return res.status(400).json({ error: 'Invalid encrypted metadata.' });
            }
            const { fileId } = decryptedMeta.data.data;
            if (!fileId) {
                return res.status(400).json({ error: 'Missing fileId in decrypted data.' });
            }
            // Delete file
            const subfolders = ['Pictures', 'Videos'];
            let deleted = false;
            for (const sub of subfolders) {
                const filePath = path.join(this.uploadsPath, sub, fileId);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deleted = true;
                    break;
                }
            }
            if (!deleted) {
                return res.status(404).json({ error: 'File not found.' });
            }
            // Remove all entries for this fileId from metadata
            let galleryMeta = this.loadMetadata();
            galleryMeta = galleryMeta.filter(entry => entry.fileName !== fileId);
            this.saveMetadata(galleryMeta);
            if (io) io.emit('survey-updated', { message: 'Gallery file deleted', fileId });
            return res.json({ result: { success: true, message: `Deleted file: ${fileId}` } });
        } catch (error) {
            console.error('Error handling gallery delete:', error);
            return res.status(500).json({ error: 'Failed to delete gallery file.' });
        }
    }

    async handleApprove(req, res, io) {
        const tokenEncryption = require('../../middleware/tokenEncryption');
        try {
            if (!req.body.encryptedData) {
                return res.status(400).json({ error: 'Missing encryptedData in request.' });
            }
            let encryptedData = req.body.encryptedData;
            if (typeof encryptedData === 'string') {
                try { encryptedData = JSON.parse(encryptedData); } catch (e) { return res.status(400).json({ error: 'Invalid encryptedData format' }); }
            }
            let decryptedMeta = null;
            try { decryptedMeta = tokenEncryption.decryptRequestData(encryptedData); } catch (e) { return res.status(400).json({ error: 'Failed to decrypt metadata.' }); }
            if (!decryptedMeta || !decryptedMeta.success) {
                return res.status(400).json({ error: 'Invalid encrypted metadata.' });
            }
            const { fileId, memberId, role } = decryptedMeta.data.data;
            if (!fileId) {
                return res.status(400).json({ error: 'Missing fileId in decrypted data.' });
            }
            let galleryMeta = this.loadMetadata();
            let found = false;
            for (let i = galleryMeta.length - 1; i >= 0; i--) {
                if (galleryMeta[i].action === 'upload' && galleryMeta[i].fileName === fileId && galleryMeta[i].role === 'WWF-Volunteer') {
                    galleryMeta[i].action = 'approve';
                    found = true;
                    break;
                }
            }
            this.saveMetadata(galleryMeta);
            if (io) io.emit('survey-updated', { message: 'Gallery file approved', fileId });
            return res.json({ result: { success: true, message: `Approved file: ${fileId}` } });
        } catch (error) {
            console.error('Error handling gallery approve:', error);
            return res.status(500).json({ error: 'Failed to approve gallery file.' });
        }
    }

    async handleReject(req, res, io) {
        const tokenEncryption = require('../../middleware/tokenEncryption');
        try {
            if (!req.body.encryptedData) {
                return res.status(400).json({ error: 'Missing encryptedData in request.' });
            }
            let encryptedData = req.body.encryptedData;
            if (typeof encryptedData === 'string') {
                try { encryptedData = JSON.parse(encryptedData); } catch (e) { return res.status(400).json({ error: 'Invalid encryptedData format' }); }
            }
            let decryptedMeta = null;
            try { decryptedMeta = tokenEncryption.decryptRequestData(encryptedData); } catch (e) { return res.status(400).json({ error: 'Failed to decrypt metadata.' }); }
            if (!decryptedMeta || !decryptedMeta.success) {
                return res.status(400).json({ error: 'Invalid encrypted metadata.' });
            }
            const { fileId, memberId, role } = decryptedMeta.data.data;
            if (!fileId) {
                return res.status(400).json({ error: 'Missing fileId in decrypted data.' });
            }
            let galleryMeta = this.loadMetadata();
            let found = false;
            for (let i = galleryMeta.length - 1; i >= 0; i--) {
                if (galleryMeta[i].action === 'upload' && galleryMeta[i].fileName === fileId && galleryMeta[i].role === 'WWF-Volunteer') {
                    found = true;
                    break;
                }
            }
            // Remove all entries for this fileId from metadata
            galleryMeta = galleryMeta.filter(entry => entry.fileName !== fileId);
            this.saveMetadata(galleryMeta);
            // Delete file
            const subfolders = ['Pictures', 'Videos'];
            let deleted = false;
            for (const sub of subfolders) {
                const filePath = path.join(this.uploadsPath, sub, fileId);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deleted = true;
                    break;
                }
            }
            if (io) io.emit('survey-updated', { message: 'Gallery file rejected and deleted', fileId });
            return res.json({ result: { success: true, message: `Rejected and deleted file: ${fileId}` } });
        } catch (error) {
            console.error('Error handling gallery reject:', error);
            return res.status(500).json({ error: 'Failed to reject gallery file.' });
        }
    }

}

module.exports = new GalleryController();
