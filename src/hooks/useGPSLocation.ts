import { useState, useEffect } from 'react';

export interface GPSCoords {
    lat: number;
    lng: number;
    accuracy: number;
}

export type GPSState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; coords: GPSCoords }
    | { status: 'error'; message: string };

export function useGPSLocation(): GPSState {
    const [state, setState] = useState<GPSState>({ status: 'loading' });

    useEffect(() => {
        if (!navigator.geolocation) {
            setState({ status: 'error', message: 'Geolocation is not supported by this browser.' });
            return;
        }

        setState({ status: 'loading' });

        const watchId = navigator.geolocation.getCurrentPosition(
            (pos) => {
                setState({
                    status: 'success',
                    coords: {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    },
                });
            },
            (err) => {
                console.warn('GPS error, falling back to default location:', err.message);
                // Fallback to IU Campus if GPS is denied
                setState({
                    status: 'success',
                    coords: { lat: 10.8752, lng: 106.8016, accuracy: 0 },
                });
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch?.(watchId as unknown as number);
    }, []);

    return state;
}