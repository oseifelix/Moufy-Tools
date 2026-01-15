import React, { useState, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Upload, Download, X, Loader2 } from 'lucide-react';
import { loadScript } from '../utils/scriptLoader';

export default function HeicConverter() {
    const [files, setFiles] = useState([]);
    const [convertedFiles, setConvertedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        loadScript('https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js')
            .then(() => setIsReady(true))
            .catch(console.error);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    }, []);

    const addFiles = (newFiles) => {
        const heicFiles = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.heic') || f.type === 'image/heic');
        if (heicFiles.length < Array.from(newFiles).length) alert("Some files were skipped. Only .HEIC files are supported.");
        setFiles(prev => [...prev, ...heicFiles]);
    };

    const convertAll = async () => {
        if (!window.heic2any) return;
        setIsProcessing(true);
        setConvertedFiles([]);
        try {
            const results = [];
            for (const file of files) {
                try {
                    const resultBlob = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
                    const blob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
                    const url = URL.createObjectURL(blob);
                    results.push({ originalName: file.name, url: url, newName: file.name.replace(/\.heic$/i, ".jpg") });
                } catch (err) { console.error(`Failed to convert ${file.name}`, err); }
            }
            setConvertedFiles(results);
        } catch (error) { console.error("Global conversion error", error); } finally { setIsProcessing(false); }
    };

    if (!isReady) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /> <span className="ml-2">Loading HEIC Engine...</span></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-lg mb-4 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2"><ImageIcon className="text-primary" /> HEIC to JPG Converter</h2>
                <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">Convert Apple's HEIC format to standard JPG images instantly.</p>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 md:p-12 text-center hover:bg-white/5 transition-colors cursor-pointer" onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={handleDrop} onClick={() => document.getElementById('heic-input').click()}>
                    <input id="heic-input" type="file" multiple accept=".heic,image/heic" className="hidden" onChange={(e) => addFiles(e.target.files)} />
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-primary"><Upload size={24} className="md:w-8 md:h-8" /></div>
                    <p className="text-base md:text-lg font-medium">Drop HEIC files here</p>
                </div>
            </div>
            {files.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-3 md:mb-4"><h3 className="font-semibold text-sm md:text-base">Queue ({files.length})</h3><button onClick={() => { setFiles([]); setConvertedFiles([]); }} className="text-xs text-red-400 hover:text-red-300">Clear All</button></div>
                    <div className="space-y-2 mb-4 md:mb-6 max-h-48 overflow-y-auto custom-scrollbar">
                        {files.map((file, i) => (<div key={i} className="flex items-center justify-between bg-white/5 p-2 md:p-3 rounded text-xs md:text-sm"><span className="truncate flex-1 max-w-[150px] md:max-w-[200px]">{file.name}</span><span className="text-muted-foreground ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>))}
                    </div>
                    {convertedFiles.length === 0 && <button onClick={convertAll} disabled={isProcessing} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm md:text-base">{isProcessing ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}{isProcessing ? 'Converting...' : 'Convert to JPG'}</button>}
                </div>
            )}
            {convertedFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-8">
                    {convertedFiles.map((item, i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col items-center gap-3 md:gap-4">
                            <img src={item.url} alt="Converted" className="h-24 md:h-40 object-contain bg-black/50 rounded-lg w-full" />
                            <div className="w-full"><p className="text-xs md:text-sm font-medium truncate mb-2">{item.newName}</p><a href={item.url} download={item.newName} className="w-full bg-green-600 hover:bg-green-700 text-white py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-2 text-xs md:text-sm font-medium transition-colors"><Download size={14} className="md:w-4 md:h-4" /> Download</a></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
