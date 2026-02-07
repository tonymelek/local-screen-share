import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useMediaStream } from '../hooks/useMediaStream';
import { useBroadcast } from '../hooks/useBroadcast';
import { Copy, Check, Users, MonitorOff, Loader2 } from 'lucide-react';

export default function BroadcastRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [copied, setCopied] = useState(false);

    const { stream, isSharing, startShare, stopShare, error: mediaError } = useMediaStream();
    const { viewerCount } = useBroadcast(isSharing ? roomId : undefined, stream);

    // Auto-start share on mount
    useEffect(() => {
        startShare();
    }, [startShare]);

    // Attach stream to video element
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Handle Stop
    const handleStop = () => {
        stopShare();
        navigate('/');
    };

    // Handle Copy Link
    const handleCopy = () => {
        const url = `${window.location.origin}/view/${roomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (mediaError) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
                        <MonitorOff className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Failed to access screen</h2>
                    <p className="text-zinc-400 mb-6">Permission denied or canceled.</p>
                    <Button onClick={() => navigate('/')} variant="secondary">Go Home</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h1 className="text-2xl font-bold">Broadcasting</h1>
                            <div className="flex items-center space-x-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-medium text-red-400 uppercase tracking-wider">LIVE</span>
                            </div>
                        </div>
                        <p className="text-zinc-400 text-sm font-mono">Room ID: <span className="text-white">{roomId}</span></p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <Users className="w-4 h-4 text-zinc-400" />
                            <span className="font-mono text-sm">{viewerCount} Viewer{viewerCount !== 1 ? 's' : ''}</span>
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleCopy}
                            leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        >
                            {copied ? 'Copied' : 'Share Link'}
                        </Button>
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={handleStop}
                        >
                            Stop Sharing
                        </Button>
                    </div>
                </div>

                {/* Video Area */}
                <div className="relative w-full flex-grow bg-black/50 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center min-h-[50vh]">
                    {isSharing ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain max-h-[75vh]"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-zinc-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Initializing stream...</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
