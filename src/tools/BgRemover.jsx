import React, { useState, useCallback } from 'react';
import { Scissors, Upload, Download, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

export default function BgRemover() {
    const [file, setFile] = useState(null);
    const [originalUrl, setOriginalUrl] = useState(null);
    const [processedUrl, setProcessedUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [error, setError] = useState(null);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            setFile(f);
            setOriginalUrl(URL.createObjectURL(f));
            setProcessedUrl(null);
            setError(null);
        }
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setOriginalUrl(URL.createObjectURL(f));
            setProcessedUrl(null);
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setIsProcessing(true);
        setProgress(0);
        setStatus('Initializing AI model...');
        setError(null);

        try {
            const blob = await removeBackground(file, {
                progress: (key, current, total) => {
                    const percentage = Math.round((current / total) * 100);
                    setProgress(percentage);
                    if (key === 'fetch:model') {
                        setStatus('Downloading AI model...');
                    } else if (key === 'compute:inference') {
                        setStatus('Removing background...');
                    } else {
                        setStatus('Processing...');
                    }
                },
            });

            const url = URL.createObjectURL(blob);
            setProcessedUrl(url);
            setStatus('Complete!');
        } catch (err) {
            console.error('Background removal error:', err);
            setError('Failed to remove background. Please try a different image.');
            setStatus('');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetAll = () => {
        setFile(null);
        setOriginalUrl(null);
        setProcessedUrl(null);
        setProgress(0);
        setStatus('');
        setError(null);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-lg">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Scissors className="text-primary" /> Background Remover
                </h2>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                        <p>{error}</p>
                    </div>
                )}

                {!file && (
                    <div
                        className="border-2 border-dashed border-white/10 rounded-xl p-8 md:p-16 text-center hover:bg-white/5 transition-colors cursor-pointer"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('bg-input').click()}
                    >
                        <input
                            id="bg-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <Upload size={40} />
                        </div>
                        <p className="text-xl font-bold">Upload an Image</p>
                        <p className="text-muted-foreground mt-2">Remove backgrounds instantly with AI</p>
                        <p className="text-xs text-muted-foreground mt-4">First use will download a ~30MB AI model</p>
                    </div>
                )}

                {file && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <ImageIcon size={18} /> Original
                                </h3>
                                <button
                                    onClick={resetAll}
                                    className="text-xs text-red-400 hover:text-red-300"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="aspect-video md:aspect-square bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
                                <img
                                    src={originalUrl}
                                    alt="Original"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Scissors size={18} /> Result
                            </h3>
                            <div
                                className="aspect-video md:aspect-square rounded-lg overflow-hidden flex items-center justify-center border border-white/10 relative"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23333'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23333'/%3E%3Crect x='10' width='10' height='10' fill='%23444'/%3E%3Crect y='10' width='10' height='10' fill='%23444'/%3E%3C/svg%3E")`,
                                    backgroundSize: '20px 20px'
                                }}
                            >
                                {isProcessing ? (
                                    <div className="flex flex-col items-center gap-4 text-primary bg-black/60 p-8 rounded-xl">
                                        <Loader2 className="animate-spin w-10 h-10" />
                                        <span className="font-medium">{status}</span>
                                        <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">{progress}%</span>
                                    </div>
                                ) : processedUrl ? (
                                    <img
                                        src={processedUrl}
                                        alt="Processed"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center p-8 text-muted-foreground opacity-50">
                                        <p>Click "Remove Background" to start</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {file && !processedUrl && !isProcessing && (
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={handleProcess}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-xl text-lg shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        >
                            Remove Background
                        </button>
                    </div>
                )}

                {processedUrl && (
                    <div className="mt-8 flex justify-center">
                        <a
                            href={processedUrl}
                            download={`bg-removed-${file.name.replace(/\.[^/.]+$/, '')}.png`}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg flex items-center gap-3 transition-colors"
                        >
                            <Download size={24} /> Download PNG (Transparent)
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
