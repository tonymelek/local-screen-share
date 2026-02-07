import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Copy, Check, Lock, Video, Mic } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function AdminPage() {
    const [passkey, setPasskey] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const expectedPasskey = import.meta.env.VITE_BROADCASTER_PASSKEY;

        if (passkey === expectedPasskey) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid passkey');
        }
    };

    const generateLink = () => {
        const roomId = uuidv4();
        const link = `${window.location.origin}/call/${roomId}?type=${callType}`;
        setGeneratedLink(link);
        setCopied(false);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isAuthenticated) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-sm">
                        <div className="flex justify-center mb-6">
                            <div className="p-3 rounded-full bg-violet-500/10 text-violet-400">
                                <Lock className="w-8 h-8" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-6">Admin Access</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Passkey
                                </label>
                                <Input
                                    type="password"
                                    value={passkey}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasskey(e.target.value)}
                                    placeholder="Enter admin passkey"
                                    className="w-full"
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                        </form>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold mb-8">Generate Private Call</h1>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Configuration Card */}
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-sm">
                        <h2 className="text-xl font-semibold mb-4">Call Settings</h2>

                        <div className="space-y-4 mb-6">
                            <label className="block text-sm font-medium text-zinc-400">Call Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setCallType('video')}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${callType === 'video'
                                        ? 'bg-violet-600 border-violet-500 text-white'
                                        : 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    <Video className="w-4 h-4" />
                                    Video & Audio
                                </button>
                                <button
                                    onClick={() => setCallType('audio')}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${callType === 'audio'
                                        ? 'bg-violet-600 border-violet-500 text-white'
                                        : 'bg-zinc-800 border-white/5 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    <Mic className="w-4 h-4" />
                                    Audio Only
                                </button>
                            </div>
                        </div>

                        <Button onClick={generateLink} className="w-full">
                            Generate Link
                        </Button>
                    </div>

                    {/* Result Card */}
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                        {!generatedLink ? (
                            <div className="text-center text-zinc-500">
                                <p>Configure settings and click generate to create a private call link.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Share this link
                                    </label>
                                    <div className="p-3 bg-black/30 rounded-lg border border-white/10 break-all font-mono text-sm text-zinc-300">
                                        {generatedLink}
                                    </div>
                                </div>
                                <Button
                                    onClick={copyLink}
                                    variant="secondary"
                                    className="w-full"
                                    leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                >
                                    {copied ? 'Copied' : 'Copy Link'}
                                </Button>
                                <p className="text-xs text-zinc-500 text-center mt-2">
                                    Share this link with both participants. They will join the same room.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
