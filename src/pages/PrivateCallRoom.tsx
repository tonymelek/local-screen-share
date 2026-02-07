import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { usePrivateCall } from '../hooks/usePrivateCall';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

export default function PrivateCallRoom() {
    const { roomId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const type = (searchParams.get('type') as 'video' | 'audio') || 'video';

    const { localStream, remoteStream, connectionStatus } = usePrivateCall(roomId, type);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Cleanup tracks on toggle (simple version just toggles enabled)
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream && type === 'video') {
            localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    };

    const endCall = () => {
        navigate('/');
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-80px)] p-4 max-w-6xl mx-auto w-full">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative">
                    {/* Remote Video (Large) */}
                    <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center min-h-[300px] md:h-full">
                        {connectionStatus === 'connected' && remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center p-6">
                                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Waiting for partner...</h3>
                                <p className="text-zinc-500">Share the link to start the call.</p>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm text-white backdrop-blur-sm">
                            Remote
                        </div>
                    </div>

                    {/* Local Video (Large or PiP style) */}
                    {/* For 1-to-1, side-by-side on desktop is good. Mobile maybe stacked. */}
                    <div className="relative bg-zinc-800 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center min-h-[200px] md:h-full">
                        {localStream ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${type === 'audio' ? 'hidden' : ''}`}
                            />
                        ) : (
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                        )}
                        {type === 'audio' && (
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mb-2">
                                    <Mic className="w-8 h-8 text-violet-400" />
                                </div>
                                <p className="text-zinc-400">Audio Only</p>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm text-white backdrop-blur-sm">
                            You
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-4 bg-zinc-900/80 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={toggleMute}
                        className={`rounded-full w-14 h-14 p-0 flex items-center justify-center ${isMuted ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' : ''}`}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </Button>

                    {type === 'video' && (
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={toggleVideo}
                            className={`rounded-full w-14 h-14 p-0 flex items-center justify-center ${isVideoOff ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' : ''}`}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </Button>
                    )}

                    <Button
                        variant="danger"
                        size="lg"
                        onClick={endCall}
                        className="rounded-full w-14 h-14 p-0 flex items-center justify-center bg-red-600 hover:bg-red-700 border-none"
                    >
                        <PhoneOff className="w-6 h-6 fill-current" />
                    </Button>
                </div>
            </div>
        </Layout>
    );
}
