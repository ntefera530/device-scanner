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

    console.log("ARP Entries:", entries);
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