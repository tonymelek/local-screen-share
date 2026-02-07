import { useEffect, useRef, useState } from 'react';
import { firestore } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

const SERVERS = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export function usePrivateCall(roomId: string | undefined, callType: 'video' | 'audio') {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'initializing' | 'connecting' | 'connected' | 'disconnected' | 'failed'>('initializing');
    const pc = useRef<RTCPeerConnection | null>(null);
    const [role, setRole] = useState<'caller' | 'callee' | null>(null);

    // Initialize Media Stream
    useEffect(() => {
        const initMedia = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('getUserMedia is not supported in this browser or context. Please use HTTPS or localhost.');
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: callType === 'video',
                    audio: true
                });
                setLocalStream(stream);
            } catch (err) {
                console.error("Error accessing media:", err);
                setConnectionStatus('failed');
            }
        };

        initMedia();
        return () => {
            localStream?.getTracks().forEach(track => track.stop());
        };
    }, [callType]);

    // Initialize WebRTC and Signaling
    useEffect(() => {
        if (!roomId || !localStream) return;

        let isMounted = true;
        const roomRef = doc(firestore, 'calls', roomId);
        const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
        const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

        const peerConnection = new RTCPeerConnection(SERVERS);
        pc.current = peerConnection;

        // Add local tracks
        localStream.getTracks().forEach(track => {
            pc.current?.addTrack(track, localStream);
        });

        // Handle remote tracks
        pc.current.ontrack = (event) => {
            setRemoteStream(_prev => {
                // Create new stream or add to existing?
                // Actually event.streams[0] is the stream.
                return event.streams[0];
            });
        };

        // Handle connection state changes
        pc.current.onconnectionstatechange = () => {
            switch (pc.current?.connectionState) {
                case 'connected': setConnectionStatus('connected'); break;
                case 'disconnected': setConnectionStatus('disconnected'); break;
                case 'failed': setConnectionStatus('failed'); break;
                default: break; // keep current
            }
        };

        const startCall = async () => {
            const roomSnapshot = await getDoc(roomRef);

            if (!isMounted) return; // Prevent race condition

            if (!roomSnapshot.exists()) {
                // We are the Caller
                setRole('caller');

                // Create Offer
                const offer = await pc.current!.createOffer();
                await pc.current!.setLocalDescription(offer);

                // Initialize Room
                await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });

                // Listen for Answer
                onSnapshot(roomRef, (snapshot) => {
                    const data = snapshot.data();
                    if (!pc.current?.currentRemoteDescription && data?.answer) {
                        const answer = new RTCSessionDescription(data.answer);
                        pc.current?.setRemoteDescription(answer);
                    }
                });

                // Listen for Callee Candidates
                onSnapshot(calleeCandidatesCollection, (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            try {
                                await pc.current?.addIceCandidate(candidate);
                            } catch (e) {
                                console.error("Error adding ice candidate", e);
                            }
                        }
                    });
                });

                // Send Caller Candidates
                pc.current!.onicecandidate = (event) => {
                    if (event.candidate) {
                        addDoc(callerCandidatesCollection, event.candidate.toJSON());
                    }
                };

            } else {
                // We are the Callee
                setRole('callee');
                const data = roomSnapshot.data();

                // Set Remote Description (Offer)
                if (data?.offer) {
                    await pc.current!.setRemoteDescription(new RTCSessionDescription(data.offer));
                }

                // Create Answer
                const answer = await pc.current!.createAnswer();
                await pc.current!.setLocalDescription(answer);

                // Update Room with Answer
                await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

                // Listen for Caller Candidates
                onSnapshot(callerCandidatesCollection, (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            try {
                                await pc.current?.addIceCandidate(candidate);
                            } catch (e) {
                                console.error("Error adding ice candidate", e);
                            }
                        }
                    });
                });

                // Send Callee Candidates
                pc.current!.onicecandidate = (event) => {
                    if (event.candidate) {
                        addDoc(calleeCandidatesCollection, event.candidate.toJSON());
                    }
                };
            }
        };

        startCall();

        // Cleanup
        const handleBeforeUnload = () => {
            // If we are caller, maybe delete room? 
            // If we are callee, maybe just leave?
            // Simple logic for now: 
            // If connection closes, we can delete room if we are caller?
            // Or better, stick to ephemeral?
            if (role === 'caller') {
                deleteDoc(roomRef);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            isMounted = false;
            peerConnection.close();
            localStream?.getTracks().forEach(t => t.stop());
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // We might want to clear room if everyone left, but that's hard to sync.
        };

    }, [roomId, localStream]); // Only run once when local stream is ready

    return { localStream, remoteStream, connectionStatus, role };
}
