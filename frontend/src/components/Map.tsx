"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
// Fix for default marker icons in Next.js
import L from "leaflet";
import { useEffect, useState } from "react";

// Mock data (would come from DB/API)
const PROJECTS = [
    { id: 1, name: "High Lake Project", lat: 51.505, lng: -0.09, commodity: "Gold", stage: "Production" },
    { id: 2, name: "Red Mountain", lat: 51.515, lng: -0.1, commodity: "Copper", stage: "Exploration" },
    { id: 3, name: "Blue Ridge", lat: 51.49, lng: -0.08, commodity: "Silver", stage: "Development" }
];

const customIcon = (color: string) => divIcon({
    className: "custom-icon",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`
});

export default function MiningMap() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="h-[500px] w-full bg-gray-900 animate-pulse rounded-xl"></div>;

    return (
        <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={false} className="h-[500px] w-full rounded-xl z-0">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {PROJECTS.map((project) => (
                <Marker
                    key={project.id}
                    position={[project.lat, project.lng]}
                    icon={customIcon(project.commodity === "Gold" ? "#D4AF37" : "#3b82f6")}
                >
                    <Popup className="custom-popup">
                        <div className="p-1">
                            <h3 className="font-bold text-gray-900">{project.name}</h3>
                            <p className="text-xs text-gray-600">{project.stage} • {project.commodity}</p>
                            <button className="mt-2 text-xs bg-gray-900 text-white px-2 py-1 rounded">View Details</button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
