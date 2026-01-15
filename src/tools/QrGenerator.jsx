import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Link as LinkIcon, Loader2 } from 'lucide-react';
import { loadScript } from '../utils/scriptLoader';

export default function QrGenerator() {
    const [value, setValue] = useState('https://moufy.tools');
    const [isReady, setIsReady] = useState(false);
    const canvasRef = useRef(null);
    const qrRef = useRef(null);

    useEffect(() => {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js')
            .then(() => setIsReady(true))
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (isReady && window.QRious && canvasRef.current) {
            // Responsive size based on viewport
            const size = window.innerWidth < 768 ? 280 : 400;
            qrRef.current = new window.QRious({
                element: canvasRef.current,
                value: value,
                size: size,
                padding: 20,
                level: 'H',
                foreground: '#ffffff',
                background: '#020817'
            });
        }
    }, [value, isReady]);

    const download = () => {
        if (canvasRef.current) {
            const link = document.createElement('a');
            link.download = 'moufy-qr-code.png';
            link.href = canvasRef.current.toDataURL();
            link.click();
        }
    };

    if (!isReady) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /> <span className="ml-2">Loading QR Engine...</span></div>;

    return (
        <div className="max-w-xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-4 md:p-8 shadow-xl text-center">
                <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center justify-center gap-2">
                    <QrCode className="text-primary" /> QR Code Generator
                </h2>
                <div className="bg-black/40 p-3 md:p-4 rounded-xl border border-white/10 inline-block mb-6 md:mb-8">
                    <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
                </div>
                <div className="space-y-4 md:space-y-6 text-left">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <LinkIcon size={14} /> Enter URL or Text
                        </label>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus:border-primary outline-none transition-colors text-sm md:text-base"
                            placeholder="https://example.com"
                        />
                    </div>
                    <button
                        onClick={download}
                        className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm md:text-base"
                    >
                        <Download size={18} className="md:w-5 md:h-5" /> Download PNG
                    </button>
                </div>
            </div>
        </div>
    );
}
