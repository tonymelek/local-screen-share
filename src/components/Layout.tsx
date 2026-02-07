import React from 'react';
import { Cast, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-zinc-950 text-white font-sans selection:bg-violet-500/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/10 blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 w-full border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-2 group">
                            <div className="p-2 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                <Cast className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">Stream<span className="text-violet-400">Sphere</span></span>
                        </Link>

                        <div className="flex items-center space-x-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 flex-grow flex flex-col">
                {children}
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-zinc-500 text-sm">
                        © {new Date().getFullYear()} StreamSphere. Built with WebRTC & Firebase.
                    </p>
                </div>
            </footer>
        </div>
    );
}
