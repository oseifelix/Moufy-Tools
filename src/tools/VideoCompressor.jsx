import React, { useState, useRef, useEffect } from 'react';
import { Video, Upload, Download, AlertTriangle, Loader2, Play } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function VideoCompressor() {
    const [loaded, setLoaded] = useState(false);
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Loading FFmpeg...');
    const [outputUrl, setOutputUrl] = useState(null);
    const [quality, setQuality] = useState(28);
    const [outputSize, setOutputSize] = useState(null);
    const [loadError, setLoadError] = useState(false);

    const ffmpegRef = useRef(new FFmpeg());
    const messageRef = useRef(null);

    const load = async () => {
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on('log', ({ message }) => {
            if (messageRef.current) messageRef.current.innerHTML = message;
        });

        ffmpeg.on('progress', ({ progress }) => {
            setProgress(Math.min(99, parseInt(progress * 100)));
        });

        try {
            // Use the esm build with proper CORS headers
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            setLoaded(true);
            setMessage('');
        } catch (error) {
            console.error('FFmpeg load error:', error);
            setLoadError(true);
            setMessage('Failed to load FFmpeg.');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const compress = async () => {
        if (!file || !loaded) return;
        setProcessing(true);
        setProgress(0);
        setOutputUrl(null);

        const ffmpeg = ffmpegRef.current;

        try {
            await ffmpeg.writeFile('input.mp4', await fetchFile(file));

            await ffmpeg.exec([
                '-i', 'input.mp4',
                '-vcodec', 'libx264',
                '-crf', quality.toString(),
                '-preset', 'ultrafast',
                'output.mp4'
            ]);

            const data = await ffmpeg.readFile('output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);

            setOutputUrl(url);
            setOutputSize((blob.size / 1024 / 1024).toFixed(2));
            setProgress(100);
        } catch (err) {
            console.error('Compression error:', err);
            alert("Compression failed. Try a smaller video or different format.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Video className="text-primary" /> Video Compressor
                    </h2>
                    <div className="hidden md:flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                        <AlertTriangle size={14} /> High CPU Usage
                    </div>
                </div>

                <div className="md:hidden bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg mb-6 flex gap-3 items-start">
                    <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">Video compression is CPU intensive. Your battery may drain quickly.</p>
                </div>

                {!loaded ? (
                    <div className="flex flex-col items-center justify-center h-48 bg-white/5 rounded-xl">
                        {loadError ? (
                            <>
                                <AlertTriangle className="text-red-400 mb-4" size={32} />
                                <p className="text-red-400 font-medium mb-2">{message}</p>
                                <p className="text-muted-foreground text-sm text-center max-w-md">
                                    This feature requires SharedArrayBuffer which needs specific browser security headers.
                                    Try using Chrome or Edge with proper COOP/COEP headers enabled.
                                </p>
                                <button
                                    onClick={() => { setLoadError(false); setMessage('Loading FFmpeg...'); load(); }}
                                    className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                                >
                                    Retry
                                </button>
                            </>
                        ) : (
                            <>
                                <Loader2 className="animate-spin text-primary mb-4" size={32} />
                                <p className="text-muted-foreground">{message}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                {!file ? (
                                    <div
                                        className="h-full min-h-[250px] border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => document.getElementById('vid-input').click()}
                                    >
                                        <input
                                            id="vid-input"
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(e) => e.target.files && setFile(e.target.files[0])}
                                        />
                                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                                            <Upload size={32} />
                                        </div>
                                        <p className="font-semibold text-lg">Select Video</p>
                                        <p className="text-xs text-muted-foreground mt-2">MP4, WebM, MOV supported</p>
                                    </div>
                                ) : (
                                    <div className="bg-black/40 rounded-xl p-4 border border-white/10 h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                                            <button onClick={() => { setFile(null); setOutputUrl(null); }} className="text-xs text-red-400 hover:text-red-300">Change</button>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center text-muted-foreground bg-black/50 rounded-lg">
                                            <Video size={48} />
                                        </div>
                                        <div className="mt-2 text-center text-xs text-muted-foreground">
                                            Original: {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col justify-center space-y-8">
                                <div className="space-y-4">
                                    <label className="flex justify-between font-medium">
                                        <span>Compression Level (CRF)</span>
                                        <span className="text-primary">{quality}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="18" max="35" step="1"
                                        value={quality}
                                        onChange={(e) => setQuality(Number(e.target.value))}
                                        className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                                        <span>High Quality (Larger)</span>
                                        <span>Low Quality (Smaller)</span>
                                    </div>
                                </div>

                                <button
                                    onClick={compress}
                                    disabled={!file || processing}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                                    {processing ? 'Compressing...' : 'Start Compression'}
                                </button>

                                {processing && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span>Progress</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {outputUrl && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
                                <div>
                                    <h3 className="text-lg font-bold text-green-400 mb-1">Compression Complete!</h3>
                                    <p className="text-sm text-green-400/80">
                                        New Size: <span className="font-mono">{outputSize} MB</span>
                                        <span className="mx-2 opacity-50">|</span>
                                        Saved: {((1 - (outputSize / (file.size / 1024 / 1024))) * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <a
                                    href={outputUrl}
                                    download={`compressed_${file.name}`}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                                >
                                    <Download size={18} /> Download
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
