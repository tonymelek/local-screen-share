import { useEffect, useRef, useState } from 'react';
import { firestore } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    addDoc,
    getDoc,
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

export function useViewer(roomId: string | undefined) {
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const viewerIdRef = useRef<string>(uuidv4());

    useEffect(() => {
        if (!roomId) return;

        const viewerId = viewerIdRef.current;
        const roomRef = doc(firestore, 'rooms', roomId);
        const viewerRef = doc(firestore, 'rooms', roomId, 'viewers', viewerId);
        const broadcasterCandidatesRef = collection(roomRef, 'viewers', viewerId, 'broadcasterCandidates');
        const viewerCandidatesRef = collection(roomRef, 'viewers', viewerId, 'viewerCandidates');

        // Check if room exists
        getDoc(roomRef).then((snapshot) => {
            if (!snapshot.exists()) {
                setStatus('error');
                return;
            }

            // Create Presence
            setDoc(viewerRef, {
                id: viewerId,
                isActive: true,
                joinedAt: Date.now()
            });
        }).catch(() => setStatus('error'));

        const pc = new RTCPeerConnection(SERVERS);
        peerConnection.current = pc;

        // Handle Remote Stream
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(() => { });
            setRemoteStream(event.streams[0]);
            setStatus('connected');
        };

        // Handle ICE Candidates -> Write to viewerCandidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(viewerCandidatesRef, event.candidate.toJSON());
            }
        };

        // Listen for Offer & ICE Candidates
        const unsubscribeViewerDoc = onSnapshot(viewerRef, async (snapshot) => {
            const data = snapshot.data();
            if (data?.offer && !pc.currentRemoteDescription) {
                const offer = new RTCSessionDescription(data.offer);
                await pc.setRemoteDescription(offer);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // Write Answer
                await setDoc(viewerRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
            }
        });

        // Listen for Broadcaster Candidates
        const unsubscribeCandidates = onSnapshot(broadcasterCandidatesRef, (snapshot) => {
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

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected') {
                setStatus('disconnected');
            }
        };

        return () => {
            pc.close();
            deleteDoc(viewerRef);
            unsubscribeViewerDoc();
            unsubscribeCandidates();
        };

    }, [roomId]);

    return { remoteStream, status };
}
