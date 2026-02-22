export function addWatermark(imageUrl, text = 'TheOtherMatthewMiller') {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      // Set watermark properties
      ctx.font = `bold ${Math.max(24, img.width * 0.03)}px Arial`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add watermark text
      ctx.fillText(
        text, 
        canvas.width / 2, 
        canvas.height - 30, // Position at bottom center
        canvas.width * 0.8  // Max width
      );
      
      // Convert canvas to data URL
      const watermarkedUrl = canvas.toDataURL('image/png');
      resolve(watermarkedUrl);
    };
    
    // In case of error, return original URL
    img.onerror = () => resolve(imageUrl);
  });
}

export function initWatermarking() {
  document.querySelectorAll('.watermark-image').forEach(async (img) => {
    const originalSrc = img.getAttribute('data-original-src');
    if (!originalSrc) return;
    
    const watermarkedUrl = await addWatermark(originalSrc);
    img.src = watermarkedUrl;
  });
}
