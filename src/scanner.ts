import { exec } from "child_process";

interface ArpEntry {
    ip: string;
    mac: string;
    interface: string;   // raw value like "en0"
    connectionType: "WiFi" | "Ethernet" | "Unknown";
}   

exec("arp -a", (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing arp: ${error.message}`);
        return;
    }

    const entries: ArpEntry[] = [];
    const regex  =/\(([\d.]+)\)\s+at\s+([0-9a-fA-F:]+).*?on\s+(\w+)/;

    //console.log(`ARP Output:\n${stdout}`);
    for (const line of stdout.split("\n")) {
        const match = line.match(regex);
        if (match) {
            const [, ip, mac, iface] = match;
            entries.push({
                ip,
                mac,
                interface: iface,
                connectionType: getConnectionType(iface),
            });
        }
    }

    //console.log("ARP Entries:", entries);

    const filteredEntries = dedupeEntries(entries.filter(isRealDevice));

    console.log("Filtered ARP Entries:", filteredEntries);
    
});


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

    if (firstOctet >= 224 && lastOctet <= 239) return false; // Multicast address
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