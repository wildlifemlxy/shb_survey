import { useState, useEffect } from 'react';
import apiService from '../services/apiServices';

const useGalleryStream = (fileId, title) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const streamImage = async () => {
      try {
        setLoading(true);
        console.log('Streaming image:', fileId);
        
        const blob = await apiService.streamImage(fileId);
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
        setError(false);
        console.log('✓ Image streamed successfully:', title);
      } catch (err) {
        console.error('❌ Failed to stream image:', fileId, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      streamImage();
    }

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [fileId, title]);

  return { imageSrc, error, loading };
};

export default useGalleryStream;
