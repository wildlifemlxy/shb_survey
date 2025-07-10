# Backend Uploads Directory

This directory stores all uploaded media files for the Straw-headed Bulbul survey platform.

## Structure
- `pictures/` - Contains uploaded image files
- `videos/` - Contains uploaded video files

## Access
Files are served via the backend API at `/uploads/pictures/` and `/uploads/videos/` endpoints.

## Storage
All uploads are processed through the backend and stored locally in this directory structure.
No delete functionality is available through the gallery interface.
