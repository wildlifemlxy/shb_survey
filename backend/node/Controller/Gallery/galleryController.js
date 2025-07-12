const path = require('path');
const fs = require('fs');

class GalleryController {
    constructor() {
        this.uploadsPath = path.join(__dirname, '../../Gallery');
        this.metadataPath = path.join(this.uploadsPath, 'metadata.json');
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

    // Load metadata from file
    loadMetadata() {
        try {
            if (fs.existsSync(this.metadataPath)) {
                const data = fs.readFileSync(this.metadataPath, 'utf8');
                return JSON.parse(data);
            }
            return {};
        } catch (error) {
            console.error('Error loading metadata:', error);
            return {};
        }
    }

    // Save metadata to file
    saveMetadata(metadata) {
        try {
            fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Error saving metadata:', error);
        }
    }

    // Retrieve all gallery items
    async retrieveGalleryItems() {
        try {
            const metadata = this.loadMetadata();
            
            // Since no manifest is used, scan the actual directories
            const pictures = [];
            const videos = [];
            
            const picturesPath = path.join(this.uploadsPath, 'Pictures');
            const videosPath = path.join(this.uploadsPath, 'Videos');
            
            // Read pictures directory
            if (fs.existsSync(picturesPath)) {
                const pictureFiles = fs.readdirSync(picturesPath);
                pictureFiles.forEach(file => {
                    const filePath = path.join(picturesPath, file);
                    const stats = fs.statSync(filePath);
                    
                    // For existing files without metadata, assume they are approved (legacy files)
                    const fileMetadata = metadata[file] || { 
                        approved: true, 
                        approvalStatus: 'approved',
                        uploadedBy: { role: 'Legacy' } 
                    };
                    
                    pictures.push({
                        id: file,
                        name: file,
                        filename: file,
                        url: `/Pictures/${file}`,
                        uploadDate: stats.birthtime.toISOString(),
                        size: stats.size,
                        type: 'image/' + path.extname(file).substring(1),
                        approved: fileMetadata.approved,
                        approvalStatus: fileMetadata.approvalStatus,
                        uploadedBy: fileMetadata.uploadedBy || { role: 'Legacy' },
                        rejectionReason: fileMetadata.rejectionReason
                    });
                });
            }
            
            // Read videos directory
            if (fs.existsSync(videosPath)) {
                const videoFiles = fs.readdirSync(videosPath);
                videoFiles.forEach(file => {
                    const filePath = path.join(videosPath, file);
                    const stats = fs.statSync(filePath);
                    
                    // For existing files without metadata, assume they are approved (legacy files)
                    const fileMetadata = metadata[file] || { 
                        approved: true, 
                        approvalStatus: 'approved',
                        uploadedBy: { role: 'Legacy' } 
                    };
                    
                    videos.push({
                        id: file,
                        name: file,
                        filename: file,
                        url: `/Videos/${file}`,
                        uploadDate: stats.birthtime.toISOString(),
                        size: stats.size,
                        type: 'video/' + path.extname(file).substring(1),
                        approved: fileMetadata.approved,
                        approvalStatus: fileMetadata.approvalStatus,
                        uploadedBy: fileMetadata.uploadedBy || { role: 'Legacy' },
                        rejectionReason: fileMetadata.rejectionReason
                    });
                });
            }
            
            return { pictures, videos };
            
        } catch (error) {
            console.error('Error retrieving gallery items:', error);
            throw new Error('Failed to retrieve gallery items');
        }
    }

    // Process uploaded files
    async processUploadedFiles(files, type, uploadedBy = null) {
        try {
            const metadata = this.loadMetadata();
            
            // Process uploaded files
            const uploadedFiles = files.map(file => {
                const relativePath = `/${type === 'pictures' ? 'Pictures' : 'Videos'}/${file.filename}`;
                
                // Determine approval status based on user role
                const isWWFVolunteer = uploadedBy && uploadedBy.role === 'WWF-Volunteer';
                const approved = !isWWFVolunteer; // Non-WWF volunteers get auto-approved
                const approvalStatus = isWWFVolunteer ? 'pending' : 'approved';
                
                // Store metadata for the uploaded file
                metadata[file.filename] = {
                    approved: approved,
                    approvalStatus: approvalStatus,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: uploadedBy || { role: 'Unknown' },
                    originalName: file.originalname
                };
                
                return {
                    id: file.filename,
                    name: file.originalname,
                    filename: file.filename,
                    path: relativePath,
                    url: relativePath,
                    uploadDate: new Date().toISOString(),
                    size: file.size,
                    type: file.mimetype,
                    approved: approved,
                    approvalStatus: approvalStatus,
                    uploadedBy: uploadedBy || { role: 'Unknown' }
                };
            });

            // Save updated metadata
            this.saveMetadata(metadata);

            console.log('Files processed successfully:', uploadedFiles);
            return {
                success: true,
                message: `${files.length} file(s) uploaded successfully`,
                files: uploadedFiles
            };

        } catch (error) {
            console.error('Upload processing error:', error);
            throw new Error('Failed to process uploaded files');
        }
    }

    // Get gallery statistics
    async getGalleryStats() {
        try {
            const galleryItems = await this.retrieveGalleryItems();
            
            const stats = {
                totalFiles: (galleryItems.pictures?.length || 0) + (galleryItems.videos?.length || 0),
                totalPictures: galleryItems.pictures?.length || 0,
                totalVideos: galleryItems.videos?.length || 0,
                totalSize: 0
            };

            // Calculate total size
            ['pictures', 'videos'].forEach(type => {
                const actualType = type === 'pictures' ? 'pictures' : 'videos';
                if (galleryItems[actualType]) {
                    galleryItems[actualType].forEach(file => {
                        stats.totalSize += file.size || 0;
                    });
                }
            });

            return stats;
        } catch (error) {
            console.error('Error getting gallery stats:', error);
            throw new Error('Failed to get gallery statistics');
        }
    }

    // Approve media - Mark media as approved and store in metadata
    async approveMedia(mediaId) {
        try {
            console.log('Approving media:', mediaId);
            
            const metadata = this.loadMetadata();
            metadata[mediaId] = {
                ...metadata[mediaId],
                approved: true,
                approvalStatus: 'approved',
                approvedAt: new Date().toISOString()
            };
            
            this.saveMetadata(metadata);
            
            return {
                success: true,
                mediaId: mediaId,
                approvedAt: new Date().toISOString(),
                status: 'approved'
            };
        } catch (error) {
            console.error('Error approving media:', error);
            throw new Error('Failed to approve media');
        }
    }

    // Reject media - Delete media file from filesystem and metadata (reject = delete)
    async rejectMedia(mediaId, reason) {
        try {
            console.log('Rejecting and deleting media:', mediaId, 'Reason:', reason);
            
            // Find the media file in Pictures or Videos directory
            const picturesPath = path.join(this.uploadsPath, 'Pictures');
            const videosPath = path.join(this.uploadsPath, 'Videos');
            
            let filePath = null;
            let mediaType = null;
            
            // Try to find the file using mediaId as filename
            if (fs.existsSync(path.join(picturesPath, mediaId))) {
                filePath = path.join(picturesPath, mediaId);
                mediaType = 'Pictures';
            } else if (fs.existsSync(path.join(videosPath, mediaId))) {
                filePath = path.join(videosPath, mediaId);
                mediaType = 'Videos';
            }
            
            if (!filePath) {
                console.log('Media file not found for rejection:', mediaId);
                throw new Error('Media file not found');
            }
            
            console.log('About to delete rejected file:', filePath);
            
            // Verify file exists before deletion
            if (!fs.existsSync(filePath)) {
                console.log('File does not exist, cannot delete:', filePath);
                throw new Error('File does not exist on filesystem');
            }
            
            // Delete the file permanently (reject = delete)
            fs.unlinkSync(filePath);
            
            // Verify the file was actually deleted
            if (fs.existsSync(filePath)) {
                console.error('File still exists after deletion attempt:', filePath);
                throw new Error('File deletion failed - file still exists');
            }
            
            console.log('Rejected media file successfully deleted from filesystem:', filePath);
            
            // Remove from metadata completely (no need to keep rejected file metadata)
            const metadata = this.loadMetadata();
            if (metadata[mediaId]) {
                delete metadata[mediaId];
                this.saveMetadata(metadata);
                console.log('Removed metadata for rejected file:', mediaId);
            }
            
            console.log('Media rejection and deletion completed successfully');
            
            return {
                success: true,
                mediaId: mediaId,
                rejectedAt: new Date().toISOString(),
                deletedAt: new Date().toISOString(),
                status: 'rejected_and_deleted',
                reason: reason || 'No reason provided',
                type: mediaType,
                filePath: filePath
            };
        } catch (error) {
            console.error('Error rejecting media:', error);
            throw new Error('Failed to reject media: ' + error.message);
        }
    }

    // Delete media - Remove media file from filesystem and metadata
    async deleteMedia(mediaInfo) {
        try {
            console.log('Deleting media:', mediaInfo);
            
            // Handle both old format (just mediaId) and new format (full media object)
            let mediaId, filename, url, type;
            
            if (typeof mediaInfo === 'string') {
                // Old format - mediaInfo is just the mediaId/filename
                mediaId = filename = mediaInfo;
            } else {
                // New format - mediaInfo is an object with full details
                mediaId = mediaInfo.mediaId;
                filename = mediaInfo.filename || mediaInfo.mediaId;
                url = mediaInfo.url;
                type = mediaInfo.type;
            }
            
            // Find the media file in Pictures or Videos directory
            const picturesPath = path.join(this.uploadsPath, 'Pictures');
            const videosPath = path.join(this.uploadsPath, 'Videos');
            
            let filePath = null;
            let mediaType = null;
            
            // Try to find the file using different methods
            const possibleFilenames = [filename, mediaId];
            
            // Check Pictures directory
            for (const name of possibleFilenames) {
                if (name && fs.existsSync(path.join(picturesPath, name))) {
                    filePath = path.join(picturesPath, name);
                    mediaType = 'Pictures';
                    break;
                }
            }
            
            // Check Videos directory if not found in Pictures
            if (!filePath) {
                for (const name of possibleFilenames) {
                    if (name && fs.existsSync(path.join(videosPath, name))) {
                        filePath = path.join(videosPath, name);
                        mediaType = 'Videos';
                        break;
                    }
                }
            }
            
            // If still not found, try to extract filename from URL
            if (!filePath && url) {
                const urlFilename = url.split('/').pop();
                if (fs.existsSync(path.join(picturesPath, urlFilename))) {
                    filePath = path.join(picturesPath, urlFilename);
                    mediaType = 'Pictures';
                } else if (fs.existsSync(path.join(videosPath, urlFilename))) {
                    filePath = path.join(videosPath, urlFilename);
                    mediaType = 'Videos';
                }
            }
            
            if (!filePath) {
                console.log('Media file not found for:', { mediaId, filename, url });
                throw new Error('Media file not found');
            }
            
            console.log('About to delete file:', filePath);
            
            // Verify file exists before deletion
            if (!fs.existsSync(filePath)) {
                console.log('File does not exist, cannot delete:', filePath);
                throw new Error('File does not exist on filesystem');
            }
            
            // Delete the file permanently
            fs.unlinkSync(filePath);
            
            // Verify the file was actually deleted
            if (fs.existsSync(filePath)) {
                console.error('File still exists after deletion attempt:', filePath);
                throw new Error('File deletion failed - file still exists');
            }
            
            console.log('Media file successfully deleted from filesystem:', filePath);
            
            // Remove from metadata (try all possible keys)
            const metadata = this.loadMetadata();
            let metadataUpdated = false;
            
            // Get the actual filename from the file path
            const actualFilename = path.basename(filePath);
            
            // Try all possible keys to ensure complete cleanup
            const keysToTry = [mediaId, filename, actualFilename];
            
            // Also try URL filename if available
            if (url) {
                const urlFilename = url.split('/').pop();
                keysToTry.push(urlFilename);
            }
            
            // Remove duplicates and try each key
            const uniqueKeys = [...new Set(keysToTry.filter(key => key))];
            
            for (const key of uniqueKeys) {
                if (metadata[key]) {
                    delete metadata[key];
                    metadataUpdated = true;
                    console.log('Removed metadata for key:', key);
                }
            }
            
            if (metadataUpdated) {
                this.saveMetadata(metadata);
                console.log('Media metadata updated');
            } else {
                console.log('No metadata found to remove for keys:', uniqueKeys);
            }
            
            console.log('Media deletion completed successfully');
            
            return {
                success: true,
                mediaId: mediaId,
                filename: filename,
                deletedAt: new Date().toISOString(),
                status: 'deleted',
                type: mediaType,
                filePath: filePath
            };
        } catch (error) {
            console.error('Error deleting media:', error);
            throw new Error('Failed to delete media: ' + error.message);
        }
    }
}

module.exports = new GalleryController();
