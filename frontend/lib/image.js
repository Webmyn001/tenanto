/**
 * Compress an image file using HTML Canvas to fit within a specified size limit.
 * If the file is not an image, it is returned untouched.
 * 
 * @param {File} file The original file
 * @param {number} maxSizeKB The maximum allowed size in KB (default: 900)
 * @returns {Promise<File>} A promise resolving to the compressed File object
 */
export async function compressImage(file, maxSizeKB = 900) {
  if (!file || !file.type.startsWith('image/')) {
    return file; // Don't compress non-image files (e.g. PDFs)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limit maximum dimension to 1600px to speed up compression and keep size low
        const maxDimension = 1600;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;

        const attemptCompression = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // fallback to original if blob creation fails
                return;
              }
              const sizeKB = blob.size / 1024;
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                // Done or minimum quality reached
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Try with lower quality
                attemptCompression(q - 0.1);
              }
            },
            'image/jpeg',
            q
          );
        };

        attemptCompression(quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
