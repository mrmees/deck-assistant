/**
 * Device Information Helper
 * Provides info about connected Stream Deck devices
 */

import streamDeck from "@elgato/streamdeck";

const logger = streamDeck.logger.createScope("DeviceInfo");

export interface DeviceInfo {
    id: string;
    name: string;
    model: string;
    cols: number;
    rows: number;
    type: number;
}

// Device type number to model name mapping
const DEVICE_TYPE_TO_MODEL: Record<number, string> = {
    0: 'StreamDeck',
    1: 'StreamDeckMini',
    2: 'StreamDeckXL',
    3: 'StreamDeckMobile',
    5: 'StreamDeckPedal',
    7: 'StreamDeckPlus',
    9: 'StreamDeckNeo',
};

/**
 * Get the first connected device info
 */
export function getFirstConnectedDevice(): DeviceInfo | null {
    try {
        const devices = Array.from(streamDeck.devices);

        logger.debug(`Found ${devices.length} connected devices`);

        if (devices.length === 0) {
            return null;
        }

        // Get the first device
        const device = devices[0];

        // Access device properties - the SDK provides these directly
        const deviceAny = device as any;
        const deviceType = deviceAny.type ?? 0;
        const deviceSize = deviceAny.size ?? { columns: 5, rows: 3 };
        const deviceName = deviceAny.name ?? 'Stream Deck';

        logger.debug(`First device: ${deviceName}, type=${deviceType}, size=${deviceSize.columns}x${deviceSize.rows}`);

        return {
            id: device.id,
            name: deviceName,
            model: DEVICE_TYPE_TO_MODEL[deviceType] || 'StreamDeck',
            cols: deviceSize.columns ?? 5,
            rows: deviceSize.rows ?? 3,
            type: deviceType
        };
    } catch (error) {
        logger.error(`Error getting device info: ${error}`);
        return null;
    }
}

/**
 * Get all connected devices
 */
export function getAllConnectedDevices(): DeviceInfo[] {
    const deviceList: DeviceInfo[] = [];

    try {
        for (const device of streamDeck.devices) {
            const deviceAny = device as any;
            const deviceType = deviceAny.type ?? 0;
            const deviceSize = deviceAny.size ?? { columns: 5, rows: 3 };
            const deviceName = deviceAny.name ?? 'Stream Deck';

            deviceList.push({
                id: device.id,
                name: deviceName,
                model: DEVICE_TYPE_TO_MODEL[deviceType] || 'StreamDeck',
                cols: deviceSize.columns ?? 5,
                rows: deviceSize.rows ?? 3,
                type: deviceType
            });
        }
    } catch (error) {
        logger.error(`Error getting all devices: ${error}`);
    }

    return deviceList;
}

/**
 * Get device info by ID
 */
export function getDeviceById(deviceId: string): DeviceInfo | null {
    try {
        for (const device of streamDeck.devices) {
            if (device.id === deviceId) {
                const deviceAny = device as any;
                const deviceType = deviceAny.type ?? 0;
                const deviceSize = deviceAny.size ?? { columns: 5, rows: 3 };
                const deviceName = deviceAny.name ?? 'Stream Deck';

                return {
                    id: device.id,
                    name: deviceName,
                    model: DEVICE_TYPE_TO_MODEL[deviceType] || 'StreamDeck',
                    cols: deviceSize.columns ?? 5,
                    rows: deviceSize.rows ?? 3,
                    type: deviceType
                };
            }
        }
    } catch (error) {
        logger.error(`Error getting device by ID: ${error}`);
    }

    return null;
}
