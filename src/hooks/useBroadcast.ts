import { useEffect, useRef, useState } from 'react';
import { firestore } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    addDoc,
    deleteDoc,
    query,
    runTransaction
} from 'firebase/firestore';

const SERVERS = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export function useBroadcast(roomId: string | undefined, stream: MediaStream | null) {
    const [viewerCount, setViewerCount] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');

    // Store peer connections
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    useEffect(() => {
        if (!roomId || !stream) return;

        const roomRef = doc(firestore, 'rooms', roomId);
        const viewersCollectionRef = collection(roomRef, 'viewers');

        // Initialize Room
        setDoc(roomRef, {
            broadcasterId: 'host',
            status: 'active',
            createdAt: Date.now(),
        })
            .then(() => {
                setConnectionStatus('ready');
                // No built-in onDisconnect for Firestore, handling cleanup in unmount
            })
            .catch(err => {
                console.error("Error creating room:", err);
                setConnectionStatus('error');
            });

        // Handle new viewers
        const unsubscribeViewers = onSnapshot(viewersCollectionRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const viewerId = change.doc.id;

                if (change.type === 'added') {
                    if (peerConnections.current[viewerId]) return;

                    console.log(`New viewer joined: ${viewerId}`);
                    setViewerCount(prev => prev + 1);

                    const pc = new RTCPeerConnection(SERVERS);
                    peerConnections.current[viewerId] = pc;

                    // Add Tracks
                    stream.getTracks().forEach(track => pc.addTrack(track, stream));

                    // Handle ICE Candidates
                    pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            const candidatesRef = collection(roomRef, 'viewers', viewerId, 'broadcasterCandidates');
                            addDoc(candidatesRef, event.candidate.toJSON());
                        }
                    };

                    // Create Offer
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    // Update Viewer Doc with Offer
                    const viewerDocRef = doc(viewersCollectionRef, viewerId);
                    await setDoc(viewerDocRef, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });

                    // Listen for Answer
                    const unsubscribeAnswer = onSnapshot(viewerDocRef, async (docSnapshot) => {
                        const data = docSnapshot.data();
                        if (data?.answer && !pc.currentRemoteDescription) {
                            const answer = new RTCSessionDescription(data.answer);
                            await pc.setRemoteDescription(answer);
                        }
                    });

                    // Listen for Viewer ICE Candidates
                    const viewerCandidatesRef = collection(roomRef, 'viewers', viewerId, 'viewerCandidates');
                    const unsubscribeCandidates = onSnapshot(viewerCandidatesRef, (snapshot) => {
                        snapshot.docChanges().forEach(async (change) => {
                            if (change.type === 'added') {
                                const data = change.doc.data();
                                const candidate = new RTCIceCandidate(data);
                                try {
                                    await pc.addIceCandidate(candidate);
                                } catch (e) {
                                    console.error("Error adding ice candidate", e);
                                }
                            }
                        });
                    });

                    // Cleanup connection listeners on viewer removal
                    // We can't easily attach cleanup specifically to this scope without a map, 
                    // but 'removed' event below handles the main cleanup.

                } else if (change.type === 'removed') {
                    if (peerConnections.current[viewerId]) {
                        console.log(`Viewer left: ${viewerId}`);
                        peerConnections.current[viewerId].close();
                        delete peerConnections.current[viewerId];
                        setViewerCount(prev => Math.max(0, prev - 1));
                    }
                }
            });
        });

        return () => {
            // Cleanup
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
            deleteDoc(roomRef); // Mark room as ended or deleted
            unsubscribeViewers();
        };
    }, [roomId, stream]);

    return { viewerCount, connectionStatus };
}
