import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Palette, X } from 'lucide-react';

// Convert HSV to RGB
const hsvToRgb = (h, s, v) => {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r = 0; g = 0; b = 0;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

// Convert RGB to Hex
const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

// Convert Hex to RGB
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
};

// Convert RGB to HSV
const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
    }
    return [h, s, v];
};

export default function ColorPicker({ color, onChange, presetColors = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hsv, setHsv] = useState([0, 1, 1]);
    const [hexInput, setHexInput] = useState(color || '#000000');
    const [isDraggingSpectrum, setIsDraggingSpectrum] = useState(false);
    const [isDraggingHue, setIsDraggingHue] = useState(false);

    const spectrumRef = useRef(null);
    const hueRef = useRef(null);
    const containerRef = useRef(null);

    // Initialize HSV from color prop
    useEffect(() => {
        if (color) {
            const [r, g, b] = hexToRgb(color);
            const [h, s, v] = rgbToHsv(r, g, b);
            setHsv([h, s, v]);
            setHexInput(color);
        }
    }, [color]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Update color from HSV
    const updateFromHsv = useCallback((newHsv) => {
        setHsv(newHsv);
        const [r, g, b] = hsvToRgb(newHsv[0], newHsv[1], newHsv[2]);
        const hex = rgbToHex(r, g, b);
        setHexInput(hex);
        onChange(hex);
    }, [onChange]);

    // Spectrum drag handler
    const handleSpectrumDrag = useCallback((e) => {
        if (!spectrumRef.current) return;
        const rect = spectrumRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        updateFromHsv([hsv[0], x, 1 - y]);
    }, [hsv, updateFromHsv]);

    // Hue drag handler
    const handleHueDrag = useCallback((e) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateFromHsv([x, hsv[1], hsv[2]]);
    }, [hsv, updateFromHsv]);

    // Mouse event handlers
    const handleSpectrumMouseDown = (e) => {
        setIsDraggingSpectrum(true);
        handleSpectrumDrag(e);
    };

    const handleHueMouseDown = (e) => {
        setIsDraggingHue(true);
        handleHueDrag(e);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingSpectrum) handleSpectrumDrag(e);
            if (isDraggingHue) handleHueDrag(e);
        };
        const handleMouseUp = () => {
            setIsDraggingSpectrum(false);
            setIsDraggingHue(false);
        };
        if (isDraggingSpectrum || isDraggingHue) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingSpectrum, isDraggingHue, handleSpectrumDrag, handleHueDrag]);

    // Handle hex input
    const handleHexChange = (e) => {
        const value = e.target.value;
        setHexInput(value);
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            const [r, g, b] = hexToRgb(value);
            const [h, s, v] = rgbToHsv(r, g, b);
            setHsv([h, s, v]);
            onChange(value);
        }
    };

    // Get the current hue color for spectrum background
    const hueColor = rgbToHex(...hsvToRgb(hsv[0], 1, 1));

    return (
        <div className="relative inline-block" ref={containerRef}>
            {/* Color Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-white/10 hover:border-white/30 transition-colors bg-slate-800"
            >
                <div
                    className="w-5 h-5 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                />
                <Palette size={14} className="text-muted-foreground" />
            </button>

            {/* Picker Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl z-50 min-w-[220px]">
                    {/* Preset Colors */}
                    {presetColors.length > 0 && (
                        <div className="flex gap-1 mb-3 flex-wrap">
                            {presetColors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        const [r, g, b] = hexToRgb(c);
                                        const [h, s, v] = rgbToHsv(r, g, b);
                                        setHsv([h, s, v]);
                                        setHexInput(c);
                                        onChange(c);
                                    }}
                                    className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${color === c ? 'border-primary' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Spectrum */}
                    <div
                        ref={spectrumRef}
                        className="w-full h-32 rounded-lg cursor-crosshair relative mb-3"
                        style={{
                            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`
                        }}
                        onMouseDown={handleSpectrumMouseDown}
                    >
                        {/* Spectrum Cursor */}
                        <div
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
                            style={{
                                left: `calc(${hsv[1] * 100}% - 8px)`,
                                top: `calc(${(1 - hsv[2]) * 100}% - 8px)`,
                                backgroundColor: color
                            }}
                        />
                    </div>

                    {/* Hue Slider */}
                    <div
                        ref={hueRef}
                        className="w-full h-4 rounded-full cursor-pointer relative mb-3"
                        style={{
                            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                        }}
                        onMouseDown={handleHueMouseDown}
                    >
                        {/* Hue Cursor */}
                        <div
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none top-0"
                            style={{
                                left: `calc(${hsv[0] * 100}% - 8px)`,
                                backgroundColor: rgbToHex(...hsvToRgb(hsv[0], 1, 1))
                            }}
                        />
                    </div>

                    {/* Hex Input */}
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg border border-white/20"
                            style={{ backgroundColor: color }}
                        />
                        <input
                            type="text"
                            value={hexInput}
                            onChange={handleHexChange}
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm font-mono"
                            placeholder="#000000"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
