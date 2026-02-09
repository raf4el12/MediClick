const DEVICE_ID_KEY = 'mediclick_device_id';

function generateDeviceId(): string {
  return crypto.randomUUID();
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
