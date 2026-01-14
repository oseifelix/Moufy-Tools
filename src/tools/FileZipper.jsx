import React, { useState, useCallback, useEffect } from 'react';
import { Archive, Upload, Download, File, X, Loader2 } from 'lucide-react';
import { loadScript } from '../utils/scriptLoader';

export default function FileZipper() {
    const [files, setFiles] = useState([]);
    const [isZipping, setIsZipping] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
            .then(() => setIsReady(true))
            .catch((e) => console.error("Failed to load JSZip", e));
    }, []);

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); }, []);
    const handleFileSelect = (e) => { if (e.target.files) addFiles(e.target.files); };
    const addFiles = (newFiles) => setFiles(prev => [...prev, ...Array.from(newFiles)]);
    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    const createZip = async () => {
        if (files.length === 0 || !window.JSZip) return;
        setIsZipping(true);
        try {
            const zip = new window.JSZip();
            files.forEach(file => zip.file(file.name, file));
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = "moufy-archive.zip"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (err) { console.error(err); alert("Failed to zip files."); } finally { setIsZipping(false); }
    };

    if (!isReady) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /><span className="ml-2">Loading Zipper Engine...</span></div>;

    return (
        <div className="max-w-3xl mx-auto"><div className="bg-card border border-border rounded-xl p-6 shadow-lg"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Archive className="text-primary" /> File Zipper</h2><div className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center hover:bg-white/5 transition-colors cursor-pointer mb-6" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => document.getElementById('file-input').click()}><input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} /><div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary"><Upload size={32} /></div><p className="text-lg font-medium">Click to upload or drag and drop</p></div>{files.length > 0 && (<div className="space-y-4 mb-6"><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Files to Zip ({files.length})</h3><div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">{files.map((file, i) => (<div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg group"><div className="flex items-center gap-3 overflow-hidden"><div className="p-2 bg-blue-500/20 text-blue-400 rounded"><File size={16} /></div><span className="truncate text-sm font-medium">{file.name}</span></div><button onClick={() => removeFile(i)} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors text-muted-foreground"><X size={16} /></button></div>))}</div><button onClick={createZip} disabled={isZipping} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">{isZipping ? (<><Loader2 size={20} className="animate-spin" /> Compressing...</>) : (<><Download size={20} /> Download Zip</>)}</button></div>)}</div></div>
    );
}
