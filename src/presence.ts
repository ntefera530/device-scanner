import { scanNetwork, normalizeMac, ArpEntry } from "./scanner";
import { knownDevices as rawKnownDevices } from "./devices.config";
import { KnownDevice } from "./types";

const knownDevices: KnownDevice[] = rawKnownDevices.map(device => ({
    ...device,
    mac: normalizeMac(device.mac),
}));


export interface DeviceStatus {
    name: string;
    mac: string;
    present: boolean;
}

export interface UnknownDevice {
    ip: string;
    mac: string;
    connectionType: "WiFi" | "Ethernet" | "Unknown";
}

export interface PresenceReport {
    known: DeviceStatus[];
    unknown: UnknownDevice[];
}

export async function checkPresence(subnet: string): Promise<PresenceReport> {
    const scannedDevices: ArpEntry[] = await scanNetwork(subnet);
    const scannedMacs = new Set(scannedDevices.map(device => device.mac));
    const knownMacs = new Set(knownDevices.map(device => device.mac));

    const known: DeviceStatus[] = knownDevices.map(device => ({
        name: device.name,
        mac: device.mac,
        present: scannedMacs.has(device.mac),
    }));

    const unknown: UnknownDevice[] = scannedDevices
        .filter(device => !knownMacs.has(device.mac))
        .map(device => ({
            ip: device.ip,
            mac: device.mac,
            connectionType: device.connectionType,
    }));

    return { known, unknown };
}

checkPresence("10.0.0").then(statuses => {
    console.log(statuses);
});