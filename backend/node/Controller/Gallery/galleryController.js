const path = require('path');
const fs = require('fs');

class GalleryController {
    constructor() {
        this.uploadsPath = path.join(__dirname, '../../../Gallery');
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
    }

    // Retrieve all gallery items
    async retrieveGalleryItems() {
        try {
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
                    pictures.push({
                        id: file,
                        name: file,
                        filename: file,
                        url: `/Pictures/${file}`,
                        uploadDate: stats.birthtime.toISOString(),
                        size: stats.size,
                        type: 'image/' + path.extname(file).substring(1)
                    });
                });
            }
            
            // Read videos directory
            if (fs.existsSync(videosPath)) {
                const videoFiles = fs.readdirSync(videosPath);
                videoFiles.forEach(file => {
                    const filePath = path.join(videosPath, file);
                    const stats = fs.statSync(filePath);
                    videos.push({
                        id: file,
                        name: file,
                        filename: file,
                        url: `/Videos/${file}`,
                        uploadDate: stats.birthtime.toISOString(),
                        size: stats.size,
                        type: 'video/' + path.extname(file).substring(1)
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
    async processUploadedFiles(files, type) {
        try {
            // Process uploaded files
            const uploadedFiles = files.map(file => {
                const relativePath = `/${type === 'pictures' ? 'Pictures' : 'Videos'}/${file.filename}`;
                return {
                    id: file.filename,
                    name: file.originalname,
                    filename: file.filename,
                    path: relativePath,
                    url: relativePath,
                    uploadDate: new Date().toISOString(),
                    size: file.size,
                    type: file.mimetype
                };
            });

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
}

module.exports = new GalleryController();
