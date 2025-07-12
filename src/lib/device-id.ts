import { v4 as uuidv4 } from 'uuid';

// Device ID storage keys
const DEVICE_ID_KEY = 'app_device_id';
const DEVICE_FINGERPRINT_KEY = 'app_device_fingerprint';

// Server-side device ID validation (doesn't use browser APIs)
export function isValidDeviceId(deviceId: string): boolean {
  if (!deviceId) return false;
  
  // Check if it's a valid UUID (our primary format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(deviceId)) return true;
  
  // Check if it's a temporary ID (fallback format)
  if (deviceId.startsWith('temp_')) return true;
  
  return false;
}

// Generate a device fingerprint based on browser characteristics
function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';
  
  // Create a unique fingerprint based on canvas rendering
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = canvas.toDataURL();
  
  // Combine with other browser characteristics
  const characteristics = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    fingerprint
  ].join('|');
  
  // Create a hash-like string
  let hash = 0;
  for (let i = 0; i < characteristics.length; i++) {
    const char = characteristics.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Get or create a persistent device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    let deviceFingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    
    // Generate current fingerprint
    const currentFingerprint = generateDeviceFingerprint();
    
    // If no device ID exists, create one
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, currentFingerprint);
      return deviceId;
    }
    
    // If fingerprint changed significantly, this might be a different device
    // but we'll still use the same device ID to avoid issues
    if (deviceFingerprint !== currentFingerprint) {
      // Update the fingerprint but keep the same device ID
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, currentFingerprint);
    }
    
    return deviceId;
  } catch (error) {
    // If localStorage is not available, generate a temporary ID
    // This will be less reliable but prevents complete failure
    console.warn('localStorage not available, using temporary device ID');
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Clear device ID (for logout or device removal)
export function clearDeviceId(): void {
  if (typeof window === 'undefined') {
    // No-op on server
    return;
  }

  try {
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(DEVICE_FINGERPRINT_KEY);
  } catch (error) {
    console.warn('Could not clear device ID from localStorage');
  }
}

// Get device info for debugging
export function getDeviceInfo(): {
  deviceId: string;
  fingerprint: string;
  userAgent: string;
  timestamp: number;
} {
  if (typeof window === 'undefined') {
    return {
      deviceId: getDeviceId(),
      fingerprint: 'server',
      userAgent: 'server',
      timestamp: Date.now()
    };
  }

  return {
    deviceId: getDeviceId(),
    fingerprint: generateDeviceFingerprint(),
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  };
} 