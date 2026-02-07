import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useViewer } from '../hooks/useViewer';
import { Loader2, AlertTriangle, MonitorPlay } from 'lucide-react';

export default function ViewerRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);

    const { remoteStream, status } = useViewer(roomId);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <MonitorPlay className="w-6 h-6 text-violet-500" />
                            Viewing Stream
                        </h1>
                        <p className="text-zinc-400 text-sm font-mono mt-1">Room: <span className="text-white">{roomId}</span></p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${status === 'connected'
                            ? 'bg-green-500/10 border-green-500/20 text-green-500'
                            : status === 'error' || status === 'disconnected'
                                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                            }`}>
                            {status}
                        </div>
                    </div>
                </div>

                {/* Video Area */}
                <div className="relative w-full flex-grow bg-black/50 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center min-h-[50vh]">

                    {status === 'connected' && remoteStream ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            controls
                            className="w-full h-full object-contain max-h-[75vh]"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            {status === 'connecting' && (
                                <>
                                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                                    <h3 className="text-xl font-medium mb-2">Connecting to host...</h3>
                                    <p className="text-zinc-500">Establishing P2P connection</p>
                                </>
                            )}

                            {status === 'disconnected' && (
                                <>
                                    <AlertTriangle className="w-10 h-10 text-zinc-500 mb-4" />
                                    <h3 className="text-xl font-medium mb-2">Stream Ended</h3>
                                    <p className="text-zinc-500 mb-6">The broadcaster has stopped sharing.</p>
                                    <Button onClick={() => navigate('/')}>Return Home</Button>
                                </>
                            )}

                            {status === 'error' && (
                                <>
                                    <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
                                    <h3 className="text-xl font-medium mb-2">Connection Failed</h3>
                                    <p className="text-zinc-500 mb-6">Room not found or connection error.</p>
                                    <Button onClick={() => navigate('/')}>Return Home</Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
