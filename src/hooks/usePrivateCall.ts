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
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
            setRemoteStream(_prev => {
                // Create new stream or add to existing?
                // Actually event.streams[0] is the stream.
                return event.streams[0];
            });
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            switch (peerConnection.connectionState) {
                case 'connected': setConnectionStatus('connected'); break;
                case 'disconnected': setConnectionStatus('disconnected'); break;
                case 'failed': setConnectionStatus('failed'); break;
                default: break; // keep current
            }
        };

        const startCall = async () => {
            console.log('[PrivateCall] Starting call for room:', roomId);

            // Generate a unique session ID for this participant
            const mySessionId = Date.now() + Math.random();

            // Try to claim the room or join it
            const roomSnapshot = await getDoc(roomRef);

            if (!isMounted) {
                console.log('[PrivateCall] Component unmounted, aborting');
                return;
            }

            let isCaller = false;

            if (!roomSnapshot.exists()) {
                // Room doesn't exist - try to create it
                console.log('[PrivateCall] Room does not exist, attempting to create as CALLER');
                try {
                    await setDoc(roomRef, {
                        callerSessionId: mySessionId,
                        createdAt: Date.now()
                    });
                    isCaller = true;
                } catch (error) {
                    // Someone else might have created it simultaneously
                    console.log('[PrivateCall] Race condition detected, re-checking room');
                    const recheckSnapshot = await getDoc(roomRef);
                    if (recheckSnapshot.exists()) {
                        const data = recheckSnapshot.data();
                        isCaller = data?.callerSessionId === mySessionId;
                    }
                }
            } else {
                // Room exists - we are the callee
                console.log('[PrivateCall] Room exists, joining as CALLEE');
                isCaller = false;
            }

            console.log('[PrivateCall] Final role:', isCaller ? 'CALLER' : 'CALLEE');
            setRole(isCaller ? 'caller' : 'callee');

            if (isCaller) {
                // Create Offer
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                console.log('[PrivateCall] Created and set local offer');

                // Update room with offer
                await updateDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });
                console.log('[PrivateCall] Wrote offer to Firestore');

                // Listen for Answer
                onSnapshot(roomRef, (snapshot) => {
                    const data = snapshot.data();
                    console.log('[PrivateCall] Room snapshot update:', data);
                    if (!peerConnection.currentRemoteDescription && data?.answer) {
                        console.log('[PrivateCall] Setting remote answer');
                        const answer = new RTCSessionDescription(data.answer);
                        peerConnection.setRemoteDescription(answer);
                    }
                });

                // Listen for Callee Candidates
                onSnapshot(calleeCandidatesCollection, (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            try {
                                await peerConnection.addIceCandidate(candidate);
                            } catch (e) {
                                console.error("Error adding ice candidate", e);
                            }
                        }
                    });
                });

                // Send Caller Candidates
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('[PrivateCall] Sending caller ICE candidate');
                        addDoc(callerCandidatesCollection, event.candidate.toJSON());
                    }
                };

            } else {
                // We are the Callee
                const data = roomSnapshot.data();

                // Wait for offer if not present yet
                if (!data?.offer) {
                    console.log('[PrivateCall] Waiting for offer...');
                    // Listen for offer
                    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
                        const updatedData = snapshot.data();
                        if (updatedData?.offer && !peerConnection.currentRemoteDescription) {
                            console.log('[PrivateCall] Offer received, setting remote offer');
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(updatedData.offer));

                            // Create Answer
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);
                            console.log('[PrivateCall] Created and set local answer');

                            // Update Room with Answer
                            await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
                            console.log('[PrivateCall] Wrote answer to Firestore');

                            unsubscribe();
                        }
                    });
                } else {
                    // Offer already exists
                    console.log('[PrivateCall] Setting remote offer');
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

                    // Create Answer
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    console.log('[PrivateCall] Created and set local answer');

                    // Update Room with Answer
                    await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
                    console.log('[PrivateCall] Wrote answer to Firestore');
                }

                // Listen for Caller Candidates
                onSnapshot(callerCandidatesCollection, (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            try {
                                await peerConnection.addIceCandidate(candidate);
                            } catch (e) {
                                console.error("Error adding ice candidate", e);
                            }
                        }
                    });
                });

                // Send Callee Candidates
                peerConnection.onicecandidate = (event) => {
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
