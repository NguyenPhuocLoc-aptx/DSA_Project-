import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Bắt buộc phải import CSS của Leaflet

// Component phụ để giúp bản đồ tự động di chuyển đến vị trí mới
const RecenterAutomatically = ({ position }: { position: [number, number] | null }) => {
    const map = useMap();
    if (position) {
        map.flyTo(position, 17); // Zoom level 17
    }
    return null;
};

const GPSMap = () => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [accuracy, setAccuracy] = useState<number>(0);

    const locateUser = () => {
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ GPS");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setPosition([lat, lng]);
                setAccuracy(pos.coords.accuracy || 50);
            },
            (error) => {
                alert("Không lấy được vị trí. Vui lòng cấp quyền truy cập vị trí.");
                console.error(error);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="relative w-full h-screen">
            {/* Nút bấm lấy vị trí */}
            <button
                onClick={locateUser}
                className="absolute top-5 right-5 z-[1000] px-4 py-2 bg-white text-black font-bold rounded-lg shadow-md hover:bg-gray-100 cursor-pointer"
            >
                Vị trí của tôi
            </button>

            {/* Khung bản đồ */}
            <MapContainer
                center={[10.7769, 106.7009]} // Tọa độ mặc định (VD: TP.HCM)
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Nếu đã lấy được vị trí thì hiển thị Marker */}
                {position && (
                    <>
                        <Circle
                            center={position}
                            radius={accuracy}
                            pathOptions={{ color: "#4285F4", fillColor: "#4285F4", fillOpacity: 0.15, weight: 1 }}
                        />
                        <CircleMarker
                            center={position}
                            radius={10}
                            pathOptions={{ fillColor: "#4285F4", color: "#ffffff", weight: 3, opacity: 1, fillOpacity: 1 }}
                        >
                            <Popup>Bạn đang ở đây</Popup>
                        </CircleMarker>

                        {/* Component trigger hiệu ứng flyTo */}
                        <RecenterAutomatically position={position} />
                    </>
                )}
            </MapContainer>
        </div>
    );
};

export default GPSMap;