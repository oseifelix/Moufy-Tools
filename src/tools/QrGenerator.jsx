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
            qrRef.current = new window.QRious({ element: canvasRef.current, value: value, size: 400, padding: 20, level: 'H', foreground: '#ffffff', background: '#020817' });
        }
    }, [value, isReady]);

    const download = () => { if (canvasRef.current) { const link = document.createElement('a'); link.download = 'moufy-qr-code.png'; link.href = canvasRef.current.toDataURL(); link.click(); } };

    if (!isReady) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /> <span className="ml-2">Loading QR Engine...</span></div>;

    return (
        <div className="max-w-xl mx-auto"><div className="bg-card border border-border rounded-xl p-8 shadow-xl text-center"><h2 className="text-2xl font-bold mb-8 flex items-center justify-center gap-2"><QrCode className="text-primary" /> QR Code Generator</h2><div className="bg-black/40 p-4 rounded-xl border border-white/10 inline-block mb-8"><canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" /></div><div className="space-y-6 text-left"><div className="space-y-2"><label className="text-sm font-medium text-muted-foreground flex items-center gap-2"><LinkIcon size={14} /> Enter URL or Text</label><input type="text" value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:border-primary outline-none transition-colors" placeholder="https://example.com" /></div><button onClick={download} className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"><Download size={20} /> Download PNG</button></div></div></div>
    );
}
