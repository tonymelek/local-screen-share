import { useState, useCallback, useEffect } from 'react';

export function useMediaStream() {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    // Start Screen Share
    const startShare = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true // Start with system audio if available
            });

            setStream(mediaStream);
            setIsSharing(true);
            setError(null);

            // Handle user clicking "Stop Sharing" in browser UI
            mediaStream.getVideoTracks()[0].onended = () => {
                stopShare();
            };

        } catch (err) {
            console.error("Error starting screen share:", err);
            setError(err as Error);
            setIsSharing(false);
        }
    }, []);

    // Stop Screen Share
    const stopShare = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsSharing(false);
        }
    }, [stream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return { stream, isSharing, error, startShare, stopShare };
}
