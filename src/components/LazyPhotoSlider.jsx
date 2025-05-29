import { useEffect, useState } from 'react';

const LazyPhotoSlider = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [sliderComponent, setSliderComponent] = useState(null);
  
  // Fetch photos from API endpoint
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Use the API endpoint that now has Redis caching
        const response = await fetch('/api/photos/matthew');
        if (!response.ok) throw new Error('Failed to fetch photos');
        
        const data = await response.json();
        setPhotos(data);
      } catch (error) {
        console.error('Error fetching photos:', error);
        // Set empty array on error
        setPhotos([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPhotos();
  }, []);
  
  // Dynamically import the Swiper component
  useEffect(() => {
    if (!isLoading && photos.length > 0) {
      // Only load the slider component when we have photos
      import('./PhotoSlider').then(module => {
        setSliderComponent(() => module.default);
      }).catch(error => {
        console.error('Error loading photo slider:', error);
      });
    }
  }, [isLoading, photos]);
  
  // Show placeholder while loading
  if (isLoading) {
    return (
      <div className="photo-slider-placeholder rounded-lg" 
           style={{
             height: '250px', 
             background: '#1a1a1a',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          borderTop: '3px solid #fff',
          animation: 'spinner 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // No photos case
  if (photos.length === 0) {
    return (
      <div className="photo-slider-empty rounded-lg" 
           style={{
             height: '100px', 
             background: '#1a1a1a',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             color: '#fff'
           }}>
        <p>No images available</p>
      </div>
    );
  }
  
  // Render the dynamic slider component when available
  if (sliderComponent) {
    const PhotoSlider = sliderComponent;
    return <PhotoSlider photos={photos} />;
  }
  
  // Default placeholder while slider component is loading
  return (
    <div className="photo-slider-loading rounded-lg" 
         style={{
           height: '250px', 
           background: '#1a1a1a',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           color: '#fff'
         }}>
      <p>Loading images...</p>
    </div>
  );
};

export default LazyPhotoSlider;
