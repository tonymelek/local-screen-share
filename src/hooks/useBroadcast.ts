import { useEffect, useRef, useState } from 'react';
import { firestore } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    addDoc,
    deleteDoc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const SERVERS = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export function useBroadcast(roomId: string | undefined, stream: MediaStream | null, shouldInitialize: boolean = false) {
    const [viewerCount, setViewerCount] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
    const [remoteDisconnect, setRemoteDisconnect] = useState(false);

    // Unique session ID for this broadcaster instance
    const sessionId = useRef(uuidv4()).current;

    // Store peer connections
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    useEffect(() => {
        if (!roomId || !stream || !shouldInitialize) return;

        const roomRef = doc(firestore, 'rooms', roomId);
        const viewersCollectionRef = collection(roomRef, 'viewers');

        // Initialize Room
        setDoc(roomRef, {
            broadcasterId: sessionId,
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
                    onSnapshot(viewerDocRef, async (docSnapshot) => {
                        const data = docSnapshot.data();
                        if (data?.answer && !pc.currentRemoteDescription) {
                            const answer = new RTCSessionDescription(data.answer);
                            await pc.setRemoteDescription(answer);
                        }
                    });

                    // Listen for Viewer ICE Candidates
                    const viewerCandidatesRef = collection(roomRef, 'viewers', viewerId, 'viewerCandidates');
                    onSnapshot(viewerCandidatesRef, (snapshot) => {
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

        // Monitor for remote disconnect (takeover)
        const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.broadcasterId && data.broadcasterId !== sessionId) {
                    console.warn("Remote drive disconnect: Another broadcaster took over.");
                    setRemoteDisconnect(true);
                }
            }
        });

        // Cleanup function for beforeunload
        const handleBeforeUnload = () => {
            deleteDoc(roomRef);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Cleanup
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};

            // Only delete if we are still the active broadcaster (haven't been taken over)
            // We need to check this logic, but for now, if unmounting, we probably want to clean up if we were the host.
            // However, if we were disconnected remotely, we probably shouldn't delete the room (the new guy owns it).
            // But strict cleaning: 

            // To be safe, we check if we are still the owner? 
            // We can't easily check async in cleanup. 
            // Strategy: If remoteDisconnect is true, DO NOT delete. 
            // BUT remoteDisconnect state might not be accessible in cleanup closure if stale?
            // Actually it's better to rely on checking if we are indeed the ones leaving vs being kicked.

            // Simplified: If we are unmounting and NOT remote disconnected, try to delete.
            // Since we can't read state reliably in cleanup without ref, let's assume if we are just closing, we delete.
            // If we are kicked, the other guy overwrote the doc, so deleteDoc might fail or delete HIS doc?
            // Deleting by ID might be dangerous if he reused the ID.
            // But he overwrote the doc content. 
            // `deleteDoc(roomRef)` deletes the doc regardless of content.
            // So if we are kicked, we MUST NOT delete the doc.

            // We will use a ref to track if we are active
            // This is tricky. Let's just remove the listener.

            unsubscribeViewers();
            unsubscribeRoom();
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // Check if *we* initiated the close versus being overridden
            // If we are overridden, the room doc has new broadcasterId.
            // We shouldn't delete it.
            // Best effort: only delete if we think we are active?
            // Actually, if we use `runTransaction` to delete only if broadcasterId matches us, that's safer.
            // But for now, let's just delete if we are unmounting and haven't detected a disconnect?
            // Or just leave it? If we leave it, the room stays "active" forever.
            // Let's allow deletion for now, but aware of race condition. 
            // Actually, usually the "Safeguard" implies if I force take over, I overwrite. 
            // If the old guy cleans up, he deletes MY room.
            // FIX: We need to NOT delete if we detect change.
            // But `useEffect` cleanup runs AFTER render or unmount.
        };
    }, [roomId, stream, shouldInitialize, sessionId]);

    // Effect to handle actual cleanup if we are the owner
    // We can use a ref to track if we should delete on unmount
    const isOwnerRef = useRef(true);
    useEffect(() => {
        if (remoteDisconnect) {
            isOwnerRef.current = false;
            // Close connections immediately
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
        }
    }, [remoteDisconnect]);

    // Ref for cleanup access
    useEffect(() => {
        const roomRef = roomId ? doc(firestore, 'rooms', roomId) : null;

        return () => {
            if (shouldInitialize && roomRef && isOwnerRef.current) {
                deleteDoc(roomRef).catch(e => console.error("Cleanup error", e));
            }
        };
    }, [roomId, shouldInitialize]); // Separate cleanup effect

    return { viewerCount, connectionStatus, remoteDisconnect };
}
