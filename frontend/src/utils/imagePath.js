/**
 * Utility function to fix image paths for React
 * Prepends PUBLIC_URL if path starts with /images/
 */
export const fixImagePath = (imagePath) => {
  if (!imagePath) return imagePath;
  
  // If path starts with /images/, prepend PUBLIC_URL
  if (imagePath.startsWith('/images/')) {
    return `${process.env.PUBLIC_URL || ''}${imagePath}`;
  }
  
  // If path is already a full URL or relative, return as is
  return imagePath;
};

