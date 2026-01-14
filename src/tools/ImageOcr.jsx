import React, { useState, useCallback } from 'react';
import { ScanText, Upload, Copy, FileText, Loader2, RefreshCw, Check, AlertTriangle, Globe } from 'lucide-react';
import Tesseract from 'tesseract.js';

const LANGUAGES = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'jpn', name: 'Japanese' },
];

export default function ImageOcr() {
    const [file, setFile] = useState(null);
    const [text, setText] = useState('');
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('eng');

    const handleDrop = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            setFile(f);
            setText('');
            setProgress(0);
            setError(null);
        }
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setText('');
            setProgress(0);
            setError(null);
        }
    };

    // Preprocess image: Grayscale + Contrast
    const preprocessImage = (imageFile) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // Contrast factor (approx 50)
                // factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
                const contrast = 60;
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

                for (let i = 0; i < data.length; i += 4) {
                    // Grayscale
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

                    // Apply Contrast
                    const color = factor * (avg - 128) + 128;
                    const final = Math.min(255, Math.max(0, color));

                    data[i] = final;     // r
                    data[i + 1] = final; // g
                    data[i + 2] = final; // b
                    // alpha (data[i+3]) remains unchanged
                }

                ctx.putImageData(imgData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(imageFile);
        });
    };

    const processImage = async () => {
        if (!file) return;
        setIsProcessing(true);
        setText('');
        setError(null);
        setProgress(0);

        try {
            setStatus('Preprocessing Image...');
            const processedImageSrc = await preprocessImage(file);

            setStatus('Initializing Engine...');
            const { data: { text } } = await Tesseract.recognize(
                processedImageSrc,
                language,
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setProgress(Math.round(m.progress * 100));
                        }
                        setStatus(m.status);
                    }
                }
            );
            setText(text);
            setStatus('Complete');
        } catch (err) {
            console.error('OCR error:', err);
            setError("Failed to extract text. Please try a clearer image.");
            setStatus("Error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
            <div className="flex flex-col gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-lg flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ScanText className="text-primary" /> Image to Text
                        </h2>

                        {/* Language Selector */}
                        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-sm">
                            <Globe size={14} className="text-muted-foreground" />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-transparent border-none outline-none text-foreground p-0 cursor-pointer"
                                disabled={isProcessing}
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    {!file ? (
                        <div
                            className="flex-1 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors min-h-[300px]"
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('ocr-input').click()}
                        >
                            <input
                                id="ocr-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                                <Upload size={32} />
                            </div>
                            <p className="font-semibold text-lg">Upload Image</p>
                            <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, BMP</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="relative flex-1 bg-black/50 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 min-h-[300px]">
                                <img src={URL.createObjectURL(file)} className="max-w-full max-h-full object-contain" alt="Upload Preview" />
                                <button
                                    onClick={() => setFile(null)}
                                    className="absolute top-2 right-2 bg-black/60 p-2 rounded-full hover:bg-black/80 transition-colors"
                                    title="Clear Image"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                            {!isProcessing && (
                                <button
                                    onClick={processImage}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                    <ScanText size={20} /> {text ? 'Re-extract Text' : 'Extract Text'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col">
                <div className="bg-card border border-border rounded-xl p-6 shadow-lg flex-1 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <FileText size={18} /> Extracted Text
                        </h3>
                        {text && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(text);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 bg-background border border-white/10 rounded-xl p-4 overflow-y-auto font-mono text-sm relative">
                        {isProcessing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                                <Loader2 className="animate-spin text-primary mb-4" size={40} />
                                <p className="font-medium text-lg capitalize">{status.replace(/-/g, ' ')}</p>
                                <div className="w-48 h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
                            </div>
                        ) : text ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <ScanText size={48} className="mb-4" />
                                <p>Text will appear here...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
