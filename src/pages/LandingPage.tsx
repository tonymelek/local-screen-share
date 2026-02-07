import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Cast, Users, ArrowRight, Lock, MonitorPlay } from 'lucide-react';

const ROOMS = [
    { id: 'big-church', name: 'Big Church' },
    { id: 'small-church', name: 'Small Church' },
    { id: 'hall', name: 'Hall' },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [passkey, setPasskey] = useState('');
    const [mode, setMode] = useState<'view' | 'broadcast'>('view');
    const [error, setError] = useState('');

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedRoom) {
            setError('Please select a room');
            return;
        }

        if (mode === 'broadcast') {
            if (passkey === import.meta.env.VITE_BROADCASTER_PASSKEY) {
                navigate(`/broadcast/${selectedRoom}`);
            } else {
                setError('Invalid passkey');
            }
        } else {
            navigate(`/view/${selectedRoom}`);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center flex-grow px-4 sm:px-6 lg:px-8 py-10 relative">

                <div className="text-center max-w-3xl mx-auto z-10 w-full">

                    <div className="mb-8">
                        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
                            Select Your <span className="text-gradient">Space</span>
                        </h1>
                        <p className="text-lg text-zinc-400">
                            Choose a room to start broadcasting or to join as a viewer.
                        </p>
                    </div>

                    <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 w-full max-w-md mx-auto shadow-2xl">

                        {/* Mode Toggle */}
                        <div className="flex bg-black/20 p-1 rounded-xl mb-8">
                            <button
                                onClick={() => setMode('view')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'view'
                                        ? 'bg-pink-500/20 text-pink-400 shadow-lg shadow-pink-500/10'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <Users size={18} />
                                Viewer
                            </button>
                            <button
                                onClick={() => setMode('broadcast')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'broadcast'
                                        ? 'bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/10'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <Cast size={18} />
                                Broadcaster
                            </button>
                        </div>

                        <form onSubmit={handleStart} className="space-y-6">

                            {/* Room Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-zinc-400 text-left">Select Room</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {ROOMS.map((room) => (
                                        <button
                                            key={room.id}
                                            type="button"
                                            onClick={() => setSelectedRoom(room.id)}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group ${selectedRoom === room.id
                                                    ? mode === 'broadcast'
                                                        ? 'bg-violet-500/10 border-violet-500/50 text-white'
                                                        : 'bg-pink-500/10 border-pink-500/50 text-white'
                                                    : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <MonitorPlay className={`w-5 h-5 ${selectedRoom === room.id ? (mode === 'broadcast' ? 'text-violet-400' : 'text-pink-400') : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                                                <span className="font-medium">{room.name}</span>
                                            </div>
                                            {selectedRoom === room.id && (
                                                <div className={`w-2 h-2 rounded-full ${mode === 'broadcast' ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]'}`} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Passkey Input (Broadcaster Only) */}
                            {mode === 'broadcast' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <label className="block text-sm font-medium text-zinc-400 text-left">Broadcaster Passkey</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-zinc-600" />
                                        </div>
                                        <input
                                            type="password"
                                            value={passkey}
                                            onChange={(e) => setPasskey(e.target.value)}
                                            className="block w-full pl-10 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                                            placeholder="Enter passkey"
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full mt-2"
                                size="lg"
                                variant={mode === 'broadcast' ? 'primary' : 'secondary'}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                                disabled={!selectedRoom || (mode === 'broadcast' && !passkey)}
                            >
                                {mode === 'broadcast' ? 'Start Broadcast' : 'Join Room'}
                            </Button>

                        </form>
                    </div>

                    <p className="mt-8 text-sm text-zinc-600">
                        {mode === 'broadcast'
                            ? "Provide the passkey to start streaming."
                            : "Select a room found in your location to join."}
                    </p>

                </div>
            </div>
        </Layout>
    );
}
