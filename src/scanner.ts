import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ArpEntry {
    ip: string;
    mac: string;
    interface: string;   // raw value like "en0"
    connectionType: "WiFi" | "Ethernet" | "Unknown";
}   



async function pingSweep(subnet: string): Promise<void> {
    const pings: Promise<unknown>[] = [];

    for(let i = 0; i <= 254; i++){
        const ip = `${subnet}.${i}`;
        pings.push(execAsync(`ping -c 1 -t 1 ${ip}`).catch(() => {

        }));
    }
    await Promise.all(pings);
}


async function scanNetwork(subnet: string): Promise<ArpEntry[]> {
    await pingSweep(subnet);

    const { stdout } = await execAsync("arp -a");

    const entries: ArpEntry[] = [];
    const regex  =/\(([\d.]+)\)\s+at\s+([0-9a-fA-F:]+).*?on\s+(\w+)/;

    for (const line of stdout.split("\n")) {
        const match = line.match(regex);
        if (match) {
            const [, ip, mac, iface] = match;
            entries.push({
                ip,
                mac: normalizeMac(mac),
                interface: iface,
                connectionType: getConnectionType(iface),
            });
        }
    }

    return dedupeEntries(entries.filter(isRealDevice));

};


function getConnectionType(iface: string): "WiFi" | "Ethernet" | "Unknown" {
    const interfaceMap: Record<string, "WiFi" | "Ethernet"> = {
        en0: "Ethernet",
        en1: "WiFi",
        en4: "Ethernet", // Ethernet Adapter
        en5: "Ethernet", // Ethernet Adapter
        en2: "Ethernet", // Thunderbolt 1 
        en3: "Ethernet", // Thunderbolt 2
    };
    return interfaceMap[iface] || "Unknown";
}

//Removes entries that are not real devices, such as multicast addresses, broadcast addresses, and incomplete ARP entries.
function isRealDevice(entry: ArpEntry): boolean {
    const firstOctet = parseInt(entry.ip.split(".")[0], 10);
    const lastOctet = parseInt(entry.ip.split(".")[3], 10);

    if (firstOctet >= 224 && firstOctet <= 239) return false; // Multicast address
    if (lastOctet ===  255) return false; // Broadcast address
    if (entry.mac.toLowerCase() === "ff:ff:ff:ff:ff:ff") return false; // Broadcast MAC
    if (entry.mac.toLowerCase() === "00:00:00:00:00:00") return false; // Invalid MAC
    if (entry.mac.toLowerCase() === "(incomplete)") return false; // Stale ARP entry

    return true;
}

//Removes duplicated entries based on MAC address
function dedupeEntries(entries: ArpEntry[]): ArpEntry[] {
    const seen = new Map<string, ArpEntry>();
    for (const entry of entries) {
        if (!seen.has(entry.mac)) {
            seen.set(entry.mac, entry);
        }
    }

    return Array.from(seen.values());
}

//Add padding and lowercase
function normalizeMac(mac: string): string {
    return mac
        .split(":")
        .map((part) => part.padStart(2, "0"))
        .join(":")
        .toLowerCase();
}

scanNetwork("10.0.0").then((devices) => {
    console.log("Scanned devices:", devices);
});