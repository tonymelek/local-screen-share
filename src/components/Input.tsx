import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${error
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/10 focus:border-violet-500/50'
                        } text-white placeholder-zinc-500 ${className}`}
                    {...props}
                />
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
