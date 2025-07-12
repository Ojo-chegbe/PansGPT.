'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Device {
  id: string;
  deviceId: string;
  firstUsed: string;
  lastUsed: string;
  isCurrentDevice: boolean;
}

export default function DeviceManagement() {
  useSession();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/devices');
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      const data = await response.json();
      setDevices(data.devices);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to remove this device? You will need to log in again from this device to use it.')) {
      return;
    }

    try {
      setRemovingDevice(deviceId);
      const response = await fetch('/api/user/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove device');
      }

      // Refresh devices list
      await fetchDevices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemovingDevice(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceDisplayName = (device: Device) => {
    if (device.isCurrentDevice) {
      return 'Current Device';
    }
    // Show first 8 characters of device ID for identification
    return `Device ${device.deviceId.substring(0, 8)}...`;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-2 text-green-300">Loading devices...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-lg font-bold text-white mb-4">Device Management</h2>
      
      {error && (
        <div className="bg-red-900/60 border border-red-700/40 text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-300">
          You can have up to 2 devices registered. Remove a device to log in from a new one.
        </p>
      </div>

      {devices.length === 0 ? (
        <p className="text-center text-gray-400 py-4">No devices found.</p>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <div key={device.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-white">
                      {getDeviceDisplayName(device)}
                    </h3>
                    {device.isCurrentDevice && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/60 text-green-400">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 mt-1">
                    First used: {formatDate(device.firstUsed)}
                  </p>
                  <p className="text-sm text-gray-300">
                    Last used: {formatDate(device.lastUsed)}
                  </p>
                </div>
                {!device.isCurrentDevice && (
                  <button
                    onClick={() => removeDevice(device.deviceId)}
                    disabled={removingDevice === device.deviceId}
                    className="ml-4 inline-flex items-center px-3 py-2 border border-red-400 text-sm font-medium rounded-md text-red-400 bg-gray-800 hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {removingDevice === device.deviceId ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-900/40 border border-blue-700/40 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• Each device gets a unique identifier when you first log in</li>
          <li>• You can have up to 2 devices registered at once</li>
          <li>• Removing a device allows you to log in from a new one</li>
          <li>• Your current device cannot be removed</li>
        </ul>
      </div>
    </div>
  );
} 