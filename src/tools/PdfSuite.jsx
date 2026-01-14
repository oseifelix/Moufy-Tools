import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    FileText, Type, Eraser, Download, X, ChevronRight, ChevronLeft, Loader2,
    MousePointer2, Square, Circle, Minus, ArrowRight, Image as ImageIcon,
    Highlighter, Underline, Strikethrough, PenTool, Undo2, Redo2,
    ZoomIn, ZoomOut, LayoutGrid, Palette, Bold, Italic, AlignLeft,
    AlignCenter, AlignRight, Upload, Trash2, Move, Pencil
} from 'lucide-react';
import { loadScript } from '../utils/scriptLoader';
import { clsx } from 'clsx';
import * as PDFLib from 'pdf-lib';
import ColorPicker from '../components/ColorPicker';

const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFFFFF'];
const HIGHLIGHT_COLORS = ['#FFFF00', '#00FF00', '#FF69B4', '#87CEEB', '#FFA500'];

export default function PdfSuite() {
    // File and PDF state
    const [file, setFile] = useState(null);
    const [pdfProxy, setPdfProxy] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1);
    const [isReady, setIsReady] = useState(false);

    // Optimize initial scale for mobile
    useEffect(() => {
        if (window.innerWidth < 768) {
            setScale(0.6);
        }
    }, []);
    const [isProcessing, setIsProcessing] = useState(false);

    // Tool state
    const [activeTool, setActiveTool] = useState('select');
    const [overlays, setOverlays] = useState({});
    const [selectedOverlay, setSelectedOverlay] = useState(null);
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [thumbnails, setThumbnails] = useState({});

    // History for undo/redo
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Tool options
    const [textOptions, setTextOptions] = useState({ font: 'Arial', size: 16, color: '#000000', bold: false, italic: false, align: 'left' });
    const [shapeOptions, setShapeOptions] = useState({ stroke: '#000000', fill: 'transparent', strokeWidth: 2 });
    const [highlightColor, setHighlightColor] = useState('#FFFF00');
    const [drawColor, setDrawColor] = useState('#000000');
    const [drawWidth, setDrawWidth] = useState(2);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingPath, setDrawingPath] = useState([]);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedItem, setDraggedItem] = useState(null);

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, item: null });

    // Refs
    const canvasRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const renderTaskRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const containerRef = useRef(null);
    const dragInitialMouseRef = useRef({ x: 0, y: 0 });

    // Initialize PDF.js
    useEffect(() => {
        const init = async () => {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            setIsReady(true);
        };
        init();
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); undo(); }
                else if (e.key === 'y') { e.preventDefault(); redo(); }
                else if (e.key === 's') { e.preventDefault(); savePdf(); }
            }
            if (e.key === 'Delete' && selectedOverlay) {
                removeOverlay(currentPage, selectedOverlay);
                setSelectedOverlay(null);
            }
            if (e.key === 'Escape') {
                setActiveTool('select');
                setSelectedOverlay(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedOverlay, currentPage, historyIndex]);

    // File upload handler
    const handleFileUpload = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setIsProcessing(true);
        try {
            const arrayBuffer = await f.arrayBuffer();
            const loadingTask = window.pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            setPdfProxy(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            setOverlays({});
            setHistory([]);
            setHistoryIndex(-1);
            setSelectedOverlay(null);
            // Generate thumbnails
            await generateThumbnails(pdf);
        } catch (err) {
            console.error('Failed to load PDF:', err);
            alert('Failed to load PDF. Please try a different file.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Generate page thumbnails
    const generateThumbnails = async (pdf) => {
        const thumbs = {};
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            thumbs[i] = canvas.toDataURL();
        }
        setThumbnails(thumbs);
    };

    // Render current page
    const renderPage = useCallback(async () => {
        if (!pdfProxy || !canvasRef.current) return;
        if (renderTaskRef.current) {
            try { renderTaskRef.current.cancel(); } catch (e) { }
        }
        const page = await pdfProxy.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Also resize drawing canvas
        if (drawCanvasRef.current) {
            drawCanvasRef.current.width = viewport.width;
            drawCanvasRef.current.height = viewport.height;
        }

        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        try { await renderTask.promise; } catch (e) { }
    }, [pdfProxy, currentPage, scale]);

    useEffect(() => { renderPage(); }, [renderPage]);

    // Save to history for undo/redo
    const saveToHistory = (newOverlays) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newOverlays)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setOverlays(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setOverlays(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    // Overlay management
    const addOverlay = (pageIdx, item) => {
        const newOverlays = {
            ...overlays,
            [pageIdx]: [...(overlays[pageIdx] || []), { ...item, id: Date.now() }]
        };
        setOverlays(newOverlays);
        saveToHistory(newOverlays);
    };

    const updateOverlay = (pageIdx, id, updates, saveHistory = false) => {
        const newOverlays = {
            ...overlays,
            [pageIdx]: overlays[pageIdx].map(item => item.id === id ? { ...item, ...updates } : item)
        };
        setOverlays(newOverlays);
        if (saveHistory) {
            saveToHistory(newOverlays);
        }
    };

    // Drag handlers
    const handleDragStart = (e, item) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();

        const { x: mouseX, y: mouseY } = getPoint(e);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        dragInitialMouseRef.current = { x: clientX, y: clientY };
        setDraggedItem(item);
        setSelectedOverlay(item.id);

        // Handle line/arrow items that use x1/y1/x2/y2
        if (item.type === 'line' || item.type === 'arrow') {
            const itemX = Math.min(item.x1, item.x2);
            const itemY = Math.min(item.y1, item.y2);
            setDragStart({ x: mouseX - itemX, y: mouseY - itemY });
        } else {
            setDragStart({ x: mouseX - (item.x || 0), y: mouseY - (item.y || 0) });
        }
    };

    const handleDragMove = (e) => {
        if (!draggedItem) return;

        // Check for drag threshold (3px) if not already dragging
        if (!isDragging) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const deltaX = Math.abs(clientX - dragInitialMouseRef.current.x);
            const deltaY = Math.abs(clientY - dragInitialMouseRef.current.y);
            if (deltaX > 3 || deltaY > 3) {
                setIsDragging(true);
            } else {
                return; // Haven't moved enough yet
            }
        }

        // Prevent scrolling on touch
        if (e.touches) e.preventDefault();

        const { x: newX, y: newY } = getPoint(e); // getPoint returns scaled X/Y relative to canvas

        // Calculate updates based on new position minus initial offset
        const targetX = newX - dragStart.x;
        const targetY = newY - dragStart.y;

        // Handle line/arrow items that use x1/y1/x2/y2
        if (draggedItem.type === 'line' || draggedItem.type === 'arrow') {
            const oldMinX = Math.min(draggedItem.x1, draggedItem.x2);
            const oldMinY = Math.min(draggedItem.y1, draggedItem.y2);
            const deltaX = targetX - oldMinX;
            const deltaY = targetY - oldMinY;
            updateOverlay(currentPage, draggedItem.id, {
                x1: draggedItem.x1 + deltaX,
                y1: draggedItem.y1 + deltaY,
                x2: draggedItem.x2 + deltaX,
                y2: draggedItem.y2 + deltaY
            });
            // Update draggedItem reference for next move
            setDraggedItem({
                ...draggedItem,
                x1: draggedItem.x1 + deltaX,
                y1: draggedItem.y1 + deltaY,
                x2: draggedItem.x2 + deltaX,
                y2: draggedItem.y2 + deltaY
            });
        } else {
            updateOverlay(currentPage, draggedItem.id, { x: targetX, y: targetY });
        }
    };

    const handleDragEnd = () => {
        if (isDragging && draggedItem) {
            // Save to history when drag ends
            saveToHistory(overlays);
        }
        setIsDragging(false);
        setDraggedItem(null);
    };

    // Resize handlers
    const handleResizeStart = (e, item, handle) => {
        e.stopPropagation();
        e.preventDefault(); // This is good for both mouse (selection) and touch (scroll)
        setIsResizing(true);
        setResizeHandle(handle);
        setSelectedOverlay(item.id);

        const { x, y } = getPoint(e);
        setResizeStart({
            x,
            y,
            item: { ...item }
        });
    };

    const handleResizeMove = (e) => {
        if (!isResizing || !resizeStart.item) return;

        // Prevent scrolling on touch
        if (e.touches) e.preventDefault();

        const { x: mouseX, y: mouseY } = getPoint(e);
        const item = resizeStart.item;
        const deltaX = mouseX - resizeStart.x;
        const deltaY = mouseY - resizeStart.y;

        let updates = {};

        // Handle elements with width/height (rect, highlight, whiteout, image)
        if (item.width !== undefined && item.height !== undefined) {
            switch (resizeHandle) {
                case 'se':
                    updates = { width: Math.max(20, item.width + deltaX), height: Math.max(20, item.height + deltaY) };
                    break;
                case 'sw':
                    updates = { x: item.x + deltaX, width: Math.max(20, item.width - deltaX), height: Math.max(20, item.height + deltaY) };
                    break;
                case 'ne':
                    updates = { y: item.y + deltaY, width: Math.max(20, item.width + deltaX), height: Math.max(20, item.height - deltaY) };
                    break;
                case 'nw':
                    updates = { x: item.x + deltaX, y: item.y + deltaY, width: Math.max(20, item.width - deltaX), height: Math.max(20, item.height - deltaY) };
                    break;
                case 'e':
                    updates = { width: Math.max(20, item.width + deltaX) };
                    break;
                case 'w':
                    updates = { x: item.x + deltaX, width: Math.max(20, item.width - deltaX) };
                    break;
                case 'n':
                    updates = { y: item.y + deltaY, height: Math.max(20, item.height - deltaY) };
                    break;
                case 's':
                    updates = { height: Math.max(20, item.height + deltaY) };
                    break;
            }
        }
        // Handle circle with radius
        else if (item.radius !== undefined) {
            const radiusDelta = Math.max(deltaX, deltaY);
            updates = { radius: Math.max(10, item.radius + radiusDelta / 2) };
        }
        // Handle line/arrow with x1/y1/x2/y2
        else if (item.x1 !== undefined) {
            if (resizeHandle === 'start') {
                updates = { x1: item.x1 + deltaX, y1: item.y1 + deltaY };
            } else if (resizeHandle === 'end') {
                updates = { x2: item.x2 + deltaX, y2: item.y2 + deltaY };
            }
        }

        if (Object.keys(updates).length > 0) {
            updateOverlay(currentPage, item.id, updates);
        }
    };

    const handleResizeEnd = () => {
        if (isResizing && resizeStart.item) {
            saveToHistory(overlays);
        }
        setIsResizing(false);
        setResizeHandle(null);
        setResizeStart({ x: 0, y: 0, item: null });
    };

    const removeOverlay = (pageIdx, id) => {
        const newOverlays = {
            ...overlays,
            [pageIdx]: overlays[pageIdx].filter(item => item.id !== id)
        };
        setOverlays(newOverlays);
        saveToHistory(newOverlays);
    };

    // Helper to get coordinates from mouse or touch event
    const getPoint = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / scale,
            y: (clientY - rect.top) / scale
        };
    };

    // Canvas click handler
    const handleCanvasClick = (e) => {
        // Prevent click if we just finished a drag/drawing (mostly for touch)
        if (activeTool === 'select') {
            setSelectedOverlay(null);
            return;
        }

        const { x, y } = getPoint(e);

        switch (activeTool) {
            case 'text':
                addOverlay(currentPage, {
                    type: 'text', x, y,
                    content: 'Click to edit',
                    ...textOptions
                });
                setActiveTool('select');
                break;
            case 'rect':
                addOverlay(currentPage, {
                    type: 'rect',
                    x: x - 50, y: y - 25,
                    width: 100, height: 50,
                    ...shapeOptions
                });
                setActiveTool('select');
                break;
            case 'circle':
                addOverlay(currentPage, {
                    type: 'circle',
                    x, y,
                    radius: 30,
                    ...shapeOptions
                });
                setActiveTool('select');
                break;
            case 'line':
                addOverlay(currentPage, {
                    type: 'line',
                    x1: x - 50, y1: y,
                    x2: x + 50, y2: y,
                    stroke: shapeOptions.stroke,
                    strokeWidth: shapeOptions.strokeWidth
                });
                setActiveTool('select');
                break;
            case 'arrow':
                addOverlay(currentPage, {
                    type: 'arrow',
                    x1: x - 50, y1: y,
                    x2: x + 50, y2: y,
                    stroke: shapeOptions.stroke,
                    strokeWidth: shapeOptions.strokeWidth
                });
                setActiveTool('select');
                break;
            case 'highlight':
                addOverlay(currentPage, {
                    type: 'highlight',
                    x: x - 60, y: y - 10,
                    width: 120, height: 20,
                    color: highlightColor
                });
                setActiveTool('select');
                break;
            case 'whiteout':
                addOverlay(currentPage, {
                    type: 'whiteout',
                    x: x - 50, y: y - 10,
                    width: 100, height: 20
                });
                setActiveTool('select');
                break;
            case 'signature':
                addOverlay(currentPage, {
                    type: 'signature',
                    x, y,
                    path: [],
                    color: '#000080',
                    text: 'Signature'
                });
                setActiveTool('select');
                break;
            default:
                break;
        }
    };

    // Drawing handlers
    const startDrawing = (e) => {
        if (activeTool !== 'draw') return;
        setIsDrawing(true);
        const { x, y } = getPoint(e);
        setDrawingPath([{ x, y }]);
    };

    const draw = (e) => {
        if (!isDrawing || activeTool !== 'draw') return;
        // Prevent scrolling on touch
        if (e.touches) e.preventDefault();

        const { x, y } = getPoint(e);
        setDrawingPath(prev => [...prev, { x, y }]);

        // Draw on the drawing canvas
        const ctx = drawCanvasRef.current.getContext('2d');
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (drawingPath.length > 0) {
            const lastPoint = drawingPath[drawingPath.length - 1];
            ctx.beginPath();
            ctx.moveTo(lastPoint.x * scale, lastPoint.y * scale);
            ctx.lineTo(x * scale, y * scale);
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        if (!isDrawing || drawingPath.length < 2) {
            setIsDrawing(false);
            setDrawingPath([]);
            return;
        }

        addOverlay(currentPage, {
            type: 'drawing',
            path: [...drawingPath],
            color: drawColor,
            width: drawWidth
        });

        // Clear drawing canvas
        const ctx = drawCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);

        setIsDrawing(false);
        setDrawingPath([]);
    };

    // Image upload
    const handleImageUpload = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const width = Math.min(200, img.width);
                const height = width / aspectRatio;
                addOverlay(currentPage, {
                    type: 'image',
                    x: 100, y: 100,
                    width, height,
                    src: event.target.result
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(f);
        setActiveTool('select');
    };

    // Save PDF
    const savePdf = async () => {
        if (!file) return;
        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const pageOverlays = overlays[i + 1] || [];
                const { height } = page.getSize();

                for (const item of pageOverlays) {
                    switch (item.type) {
                        case 'text':
                            page.drawText(item.content, {
                                x: item.x,
                                y: height - item.y - (item.size || 16),
                                size: item.size || 16,
                                color: PDFLib.rgb(...hexToRgb(item.color))
                            });
                            break;
                        case 'rect':
                            page.drawRectangle({
                                x: item.x,
                                y: height - item.y - item.height,
                                width: item.width,
                                height: item.height,
                                borderColor: PDFLib.rgb(...hexToRgb(item.stroke)),
                                borderWidth: item.strokeWidth,
                                color: item.fill !== 'transparent' ? PDFLib.rgb(...hexToRgb(item.fill)) : undefined
                            });
                            break;
                        case 'circle':
                            page.drawEllipse({
                                x: item.x,
                                y: height - item.y,
                                xScale: item.radius,
                                yScale: item.radius,
                                borderColor: PDFLib.rgb(...hexToRgb(item.stroke)),
                                borderWidth: item.strokeWidth,
                                color: item.fill !== 'transparent' ? PDFLib.rgb(...hexToRgb(item.fill)) : undefined
                            });
                            break;
                        case 'highlight':
                            page.drawRectangle({
                                x: item.x,
                                y: height - item.y - item.height,
                                width: item.width,
                                height: item.height,
                                color: PDFLib.rgb(...hexToRgb(item.color)),
                                opacity: 0.4
                            });
                            break;
                        case 'whiteout':
                            page.drawRectangle({
                                x: item.x,
                                y: height - item.y - item.height,
                                width: item.width,
                                height: item.height,
                                color: PDFLib.rgb(1, 1, 1)
                            });
                            break;
                        case 'line':
                            page.drawLine({
                                start: { x: item.x1, y: height - item.y1 },
                                end: { x: item.x2, y: height - item.y2 },
                                thickness: item.strokeWidth,
                                color: PDFLib.rgb(...hexToRgb(item.stroke))
                            });
                            break;
                        case 'arrow':
                            // Ensure numeric values
                            const ax1 = parseFloat(item.x1);
                            const ay1 = parseFloat(item.y1);
                            const ax2 = parseFloat(item.x2);
                            const ay2 = parseFloat(item.y2);
                            const aStrokeWidth = parseFloat(item.strokeWidth || 2);

                            const aAngle = Math.atan2(ay2 - ay1, ax2 - ax1);

                            // Head dimensions - same as visual rendering
                            const aTotalLength = Math.hypot(ax2 - ax1, ay2 - ay1);
                            const aHeadLength = Math.min(Math.max(12, aStrokeWidth * 5), aTotalLength * 0.9);
                            const aHeadWidth = aHeadLength * 0.6;

                            // Calculate line end point (shortened to meet arrow head base)
                            const aLineEndX = ax2 - aHeadLength * Math.cos(aAngle);
                            const aLineEndY = ay2 - aHeadLength * Math.sin(aAngle);

                            // Draw the main line (from start to base of arrow head)
                            page.drawLine({
                                start: { x: ax1, y: height - ay1 },
                                end: { x: aLineEndX, y: height - aLineEndY },
                                thickness: aStrokeWidth,
                                color: PDFLib.rgb(...hexToRgb(item.stroke))
                            });

                            // Calculate triangle points in canvas coordinates then convert to PDF
                            // Point 1: Tip at (ax2, ay2)
                            const pTipX = ax2;
                            const pTipY = height - ay2;
                            // Point 2: Base left
                            const pBaseLeftX = ax2 - aHeadLength * Math.cos(aAngle) - aHeadWidth * Math.sin(aAngle);
                            const pBaseLeftY = height - (ay2 - aHeadLength * Math.sin(aAngle) + aHeadWidth * Math.cos(aAngle));
                            // Point 3: Base right  
                            const pBaseRightX = ax2 - aHeadLength * Math.cos(aAngle) + aHeadWidth * Math.sin(aAngle);
                            const pBaseRightY = height - (ay2 - aHeadLength * Math.sin(aAngle) - aHeadWidth * Math.cos(aAngle));

                            // Get RGB color values
                            const arrowRgb = hexToRgb(item.stroke);

                            // Draw filled triangle using PDF content stream operators
                            page.pushOperators(
                                PDFLib.pushGraphicsState(),
                                PDFLib.setFillingColor(PDFLib.rgb(arrowRgb[0], arrowRgb[1], arrowRgb[2])),
                                PDFLib.moveTo(pTipX, pTipY),
                                PDFLib.lineTo(pBaseLeftX, pBaseLeftY),
                                PDFLib.lineTo(pBaseRightX, pBaseRightY),
                                PDFLib.closePath(),
                                PDFLib.fill(),
                                PDFLib.popGraphicsState()
                            );
                            break;
                        case 'drawing':
                            if (item.path.length > 1) {
                                for (let j = 0; j < item.path.length - 1; j++) {
                                    page.drawLine({
                                        start: { x: item.path[j].x, y: height - item.path[j].y },
                                        end: { x: item.path[j + 1].x, y: height - item.path[j + 1].y },
                                        thickness: item.width,
                                        color: PDFLib.rgb(...hexToRgb(item.color))
                                    });
                                }
                            }
                            break;
                        case 'signature':
                            page.drawText(item.text || 'Signature', {
                                x: item.x,
                                y: height - item.y,
                                size: 18,
                                color: PDFLib.rgb(...hexToRgb(item.color || '#000080'))
                            });
                            break;
                        case 'image':
                            try {
                                const base64Data = item.src.split(',')[1];
                                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                                let embeddedImage;
                                if (item.src.includes('image/png')) {
                                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                                } else {
                                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                                }
                                page.drawImage(embeddedImage, {
                                    x: item.x,
                                    y: height - item.y - item.height,
                                    width: item.width,
                                    height: item.height
                                });
                            } catch (err) {
                                console.error("Failed to embed image:", err);
                            }
                            break;
                        default:
                            break;
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited-${file.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error(e);
            alert("Failed to save PDF");
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper: hex to RGB array (0-1 range)
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0, 0, 0];
    };

    // Render overlay element
    const renderOverlayElement = (item) => {
        const isSelected = selectedOverlay === item.id;
        const isBeingDragged = isDragging && draggedItem?.id === item.id;
        const baseStyle = {
            position: 'absolute',
            cursor: activeTool === 'select' ? (isBeingDragged ? 'grabbing' : 'grab') : 'default',
            outline: isSelected ? '2px solid #3B82F6' : 'none',
            outlineOffset: '2px',
            transition: isBeingDragged ? 'none' : 'box-shadow 0.2s',
            boxShadow: isBeingDragged ? '0 4px 20px rgba(59, 130, 246, 0.4)' : 'none',
            zIndex: isBeingDragged || isResizing ? 1000 : 1,
            touchAction: 'none' // Prevent scrolling when dragging elements
        };

        const dragProps = {
            onMouseDown: (e) => {
                // Don't start drag if clicking on delete button or resize handle
                if (e.target.closest('button') || e.target.dataset.resize) return;
                handleDragStart(e, item);
            },
            onTouchStart: (e) => {
                if (e.target.closest('button') || e.target.dataset.resize) return;
                handleDragStart(e, item);
            }
        };

        // Resize handle style
        const handleStyle = {
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: '#3B82F6',
            border: '2px solid #fff',
            borderRadius: '2px',
            cursor: 'default',
            zIndex: 10
        };

        // Render resize handles for rectangular elements
        const renderResizeHandles = (positions = ['nw', 'ne', 'sw', 'se']) => {
            if (!isSelected || isDragging || activeTool !== 'select') return null;
            const handles = {
                nw: { top: -5, left: -5, cursor: 'nwse-resize' },
                ne: { top: -5, right: -5, cursor: 'nesw-resize' },
                sw: { bottom: -5, left: -5, cursor: 'nesw-resize' },
                se: { bottom: -5, right: -5, cursor: 'nwse-resize' },
                n: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
                s: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
                e: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' },
                w: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' }
            };
            return positions.map(pos => (
                <div
                    key={pos}
                    data-resize={pos}
                    style={{ ...handleStyle, ...handles[pos] }}
                    onMouseDown={(e) => handleResizeStart(e, item, pos)}
                    onTouchStart={(e) => handleResizeStart(e, item, pos)}
                />
            ));
        };

        switch (item.type) {
            case 'text':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: item.x * scale,
                            top: item.y * scale,
                            color: item.color,
                            fontSize: `${(item.size || 16) * scale}px`,
                            fontFamily: item.font || 'Arial',
                            fontWeight: item.bold ? 'bold' : 'normal',
                            fontStyle: item.italic ? 'italic' : 'normal',
                            textAlign: item.align || 'left',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOverlay(item.id);
                            // Focus the contentEditable to allow immediate editing
                            const editable = e.currentTarget.querySelector('[contenteditable]');
                            if (editable) {
                                setTimeout(() => editable.focus(), 0);
                            }
                        }}
                    >
                        <div
                            contentEditable={!isDragging}
                            suppressContentEditableWarning
                            onBlur={(e) => updateOverlay(currentPage, item.id, { content: e.target.innerText }, true)}
                            className="outline-none min-w-[50px] cursor-text"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {item.content}
                        </div>
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                );

            case 'rect':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: item.x * scale,
                            top: item.y * scale,
                            width: item.width * scale,
                            height: item.height * scale,
                            border: `${item.strokeWidth}px solid ${item.stroke}`,
                            backgroundColor: item.fill === 'transparent' ? 'transparent' : item.fill,
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {renderResizeHandles()}
                    </div>
                );

            case 'circle':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: (item.x - item.radius) * scale,
                            top: (item.y - item.radius) * scale,
                            width: item.radius * 2 * scale,
                            height: item.radius * 2 * scale,
                            borderRadius: '50%',
                            border: `${item.strokeWidth}px solid ${item.stroke}`,
                            backgroundColor: item.fill === 'transparent' ? 'transparent' : item.fill,
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {/* Resize handle for circle - bottom-right only */}
                        {isSelected && !isDragging && activeTool === 'select' && (
                            <div
                                data-resize="se"
                                style={{
                                    position: 'absolute',
                                    bottom: -5,
                                    right: -5,
                                    width: 10,
                                    height: 10,
                                    backgroundColor: '#3B82F6',
                                    border: '2px solid #fff',
                                    borderRadius: '50%',
                                    cursor: 'nwse-resize',
                                    zIndex: 10
                                }}
                                onMouseDown={(e) => handleResizeStart(e, item, 'se')}
                            />
                        )}
                    </div>
                );

            case 'highlight':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: item.x * scale,
                            top: item.y * scale,
                            width: item.width * scale,
                            height: item.height * scale,
                            backgroundColor: item.color,
                            opacity: 0.4,
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {renderResizeHandles()}
                    </div>
                );

            case 'whiteout':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: item.x * scale,
                            top: item.y * scale,
                            width: item.width * scale,
                            height: item.height * scale,
                            backgroundColor: '#FFFFFF',
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {renderResizeHandles()}
                    </div>
                );

            case 'line':
                const lineMinX = Math.min(item.x1, item.x2);
                const lineMinY = Math.min(item.y1, item.y2);
                const lineWidth = Math.abs(item.x2 - item.x1) + 20;
                const lineHeight = Math.abs(item.y2 - item.y1) + 20;
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: (lineMinX - 10) * scale,
                            top: (lineMinY - 10) * scale,
                            width: lineWidth * scale,
                            height: Math.max(lineHeight * scale, 20),
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                            <line
                                x1={(item.x1 - lineMinX + 10) * scale}
                                y1={(item.y1 - lineMinY + 10) * scale}
                                x2={(item.x2 - lineMinX + 10) * scale}
                                y2={(item.y2 - lineMinY + 10) * scale}
                                stroke={item.stroke}
                                strokeWidth={item.strokeWidth}
                                strokeLinecap="round"
                            />
                        </svg>
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {/* Endpoint handles for line */}
                        {isSelected && !isDragging && activeTool === 'select' && (
                            <>
                                <div
                                    data-resize="start"
                                    style={{
                                        position: 'absolute',
                                        left: (item.x1 - lineMinX + 10) * scale - 6,
                                        top: (item.y1 - lineMinY + 10) * scale - 6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: '#3B82F6',
                                        border: '2px solid #fff',
                                        borderRadius: '50%',
                                        cursor: 'move',
                                        zIndex: 10
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, item, 'start')}
                                />
                                <div
                                    data-resize="end"
                                    style={{
                                        position: 'absolute',
                                        left: (item.x2 - lineMinX + 10) * scale - 6,
                                        top: (item.y2 - lineMinY + 10) * scale - 6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: '#3B82F6',
                                        border: '2px solid #fff',
                                        borderRadius: '50%',
                                        cursor: 'move',
                                        zIndex: 10
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, item, 'end')}
                                />
                            </>
                        )}
                    </div>
                );

            case 'arrow':
                const arrowMinX = Math.min(item.x1, item.x2);
                const arrowMinY = Math.min(item.y1, item.y2);
                const arrowWidth = Math.abs(item.x2 - item.x1) + 20;
                const arrowHeight = Math.abs(item.y2 - item.y1) + 20;
                const arrowAngle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                // Arrow head scales with stroke width (min 10, scales with strokeWidth)
                const arrowHeadLength = Math.max(12, item.strokeWidth * 5);
                const arrowHeadWidth = arrowHeadLength * 0.6; // Width of the arrow head base

                const arrowX1Scaled = (item.x1 - arrowMinX + 10) * scale;
                const arrowY1Scaled = (item.y1 - arrowMinY + 10) * scale;
                const arrowX2Scaled = (item.x2 - arrowMinX + 10) * scale;
                const arrowY2Scaled = (item.y2 - arrowMinY + 10) * scale;

                // Shorten the line so it ends at the base of the arrow head
                const lineEndX = arrowX2Scaled - arrowHeadLength * scale * Math.cos(arrowAngle);
                const lineEndY = arrowY2Scaled - arrowHeadLength * scale * Math.sin(arrowAngle);

                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: (arrowMinX - 10) * scale,
                            top: (arrowMinY - 10) * scale,
                            width: arrowWidth * scale,
                            height: Math.max(arrowHeight * scale, 20),
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                            {/* Arrow line - ends at base of arrow head */}
                            <line
                                x1={arrowX1Scaled}
                                y1={arrowY1Scaled}
                                x2={lineEndX}
                                y2={lineEndY}
                                stroke={item.stroke}
                                strokeWidth={item.strokeWidth}
                                strokeLinecap="round"
                            />
                            {/* Arrow head - triangle at the tip */}
                            <polygon
                                points={`
                                    ${arrowX2Scaled},${arrowY2Scaled}
                                    ${arrowX2Scaled - arrowHeadLength * scale * Math.cos(arrowAngle) - arrowHeadWidth * scale * Math.sin(arrowAngle)},${arrowY2Scaled - arrowHeadLength * scale * Math.sin(arrowAngle) + arrowHeadWidth * scale * Math.cos(arrowAngle)}
                                    ${arrowX2Scaled - arrowHeadLength * scale * Math.cos(arrowAngle) + arrowHeadWidth * scale * Math.sin(arrowAngle)},${arrowY2Scaled - arrowHeadLength * scale * Math.sin(arrowAngle) - arrowHeadWidth * scale * Math.cos(arrowAngle)}
                                `}
                                fill={item.stroke}
                            />
                        </svg>
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {/* Endpoint handles for arrow */}
                        {isSelected && !isDragging && activeTool === 'select' && (
                            <>
                                <div
                                    data-resize="start"
                                    style={{
                                        position: 'absolute',
                                        left: (item.x1 - arrowMinX + 10) * scale - 6,
                                        top: (item.y1 - arrowMinY + 10) * scale - 6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: '#3B82F6',
                                        border: '2px solid #fff',
                                        borderRadius: '50%',
                                        cursor: 'move',
                                        zIndex: 10
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, item, 'start')}
                                />
                                <div
                                    data-resize="end"
                                    style={{
                                        position: 'absolute',
                                        left: (item.x2 - arrowMinX + 10) * scale - 6,
                                        top: (item.y2 - arrowMinY + 10) * scale - 6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: '#3B82F6',
                                        border: '2px solid #fff',
                                        borderRadius: '50%',
                                        cursor: 'move',
                                        zIndex: 10
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, item, 'end')}
                                />
                            </>
                        )}
                    </div>
                );

            case 'drawing':
                if (!item.path || item.path.length === 0) return null;
                const drawingPathData = item.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`).join(' ');
                const drawingBounds = item.path.reduce((acc, p) => ({
                    minX: Math.min(acc.minX, p.x),
                    minY: Math.min(acc.minY, p.y),
                    maxX: Math.max(acc.maxX, p.x),
                    maxY: Math.max(acc.maxY, p.y)
                }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        }}
                    >
                        <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            <path
                                d={drawingPathData}
                                stroke={item.color}
                                strokeWidth={item.width}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                            />
                        </svg>
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                style={{
                                    position: 'absolute',
                                    left: (drawingBounds.maxX * scale) + 5,
                                    top: (drawingBounds.minY * scale) - 10
                                }}
                                className="bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 z-50"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                );

            case 'signature':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: item.x * scale,
                            top: item.y * scale,
                            color: item.color || '#000080',
                            fontFamily: 'cursive',
                            fontSize: `${18 * scale}px`,
                            fontStyle: 'italic',
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOverlay(item.id);
                            // Focus the contentEditable to allow immediate editing
                            const editable = e.currentTarget.querySelector('[contenteditable]');
                            if (editable) {
                                setTimeout(() => editable.focus(), 0);
                            }
                        }}
                    >
                        <div
                            contentEditable={!isDragging}
                            suppressContentEditableWarning
                            onBlur={(e) => updateOverlay(currentPage, item.id, { text: e.target.innerText }, true)}
                            className="outline-none min-w-[80px] cursor-text"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {item.text || 'Signature'}
                        </div>
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                );

            case 'image':
                return (
                    <div
                        key={item.id}
                        style={{
                            ...baseStyle,
                            left: item.x * scale,
                            top: item.y * scale,
                            width: item.width * scale,
                            height: item.height * scale,
                            pointerEvents: 'auto'
                        }}
                        {...dragProps}
                        onClick={(e) => { e.stopPropagation(); setSelectedOverlay(item.id); }}
                    >
                        <img src={item.src} alt="Inserted" className="w-full h-full object-contain pointer-events-none" draggable={false} />
                        {isSelected && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeOverlay(currentPage, item.id); setSelectedOverlay(null); }}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {renderResizeHandles()}
                    </div>
                );

            default:
                return null;
        }
    };

    // Tool button component
    const ToolButton = ({ tool, icon: Icon, title, onClick }) => (
        <button
            onClick={onClick || (() => setActiveTool(tool))}
            className={clsx(
                "p-2 rounded-lg transition-all flex items-center justify-center",
                activeTool === tool
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "hover:bg-white/10 text-muted-foreground hover:text-white"
            )}
            title={title}
        >
            <Icon size={18} />
        </button>
    );

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[85vh] max-w-7xl mx-auto bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-white/5 border-b border-border p-2 flex items-center gap-2 overflow-x-auto">
                {/* Logo & Upload */}
                <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                    <FileText className="text-primary" size={24} />
                    <span className="font-bold hidden lg:block">Pro PDF Editor</span>
                    {!file && (
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="ml-2 bg-primary px-3 py-1.5 rounded text-sm font-semibold hover:bg-primary/90 flex items-center gap-2"
                        >
                            <Upload size={16} /> Open PDF
                        </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                </div>

                {file && (
                    <>
                        {/* Select & Move Tools */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <ToolButton tool="select" icon={MousePointer2} title="Select (Esc)" />
                        </div>

                        {/* Text Tools */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <ToolButton tool="text" icon={Type} title="Add Text" />
                            <ToolButton tool="signature" icon={PenTool} title="Signature" />
                        </div>

                        {/* Shape Tools */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <ToolButton tool="rect" icon={Square} title="Rectangle" />
                            <ToolButton tool="circle" icon={Circle} title="Circle" />
                            <ToolButton tool="line" icon={Minus} title="Line" />
                            <ToolButton tool="arrow" icon={ArrowRight} title="Arrow" />
                        </div>

                        {/* Annotation Tools */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <ToolButton tool="draw" icon={Pencil} title="Freehand Draw" />
                            <ToolButton tool="highlight" icon={Highlighter} title="Highlight" />
                            <ToolButton tool="whiteout" icon={Eraser} title="Whiteout / Redact" />
                        </div>

                        {/* Image */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <button
                                onClick={() => imageInputRef.current.click()}
                                className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                                title="Insert Image"
                            >
                                <ImageIcon size={18} />
                            </button>
                            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </div>

                        {/* Undo/Redo */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo2 size={18} />
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo2 size={18} />
                            </button>
                        </div>

                        {/* Thumbnails Toggle */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <button
                                onClick={() => setShowThumbnails(!showThumbnails)}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    showThumbnails ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-muted-foreground"
                                )}
                                title="Toggle Page Thumbnails"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 px-2 border-r border-white/10">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all" title="Zoom Out">
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all" title="Zoom In">
                                <ZoomIn size={18} />
                            </button>
                        </div>

                        {/* Export */}
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                onClick={savePdf}
                                disabled={isProcessing}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                Export PDF
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Tool Options Bar (Context Sensitive) */}
            {file && (activeTool === 'text' || activeTool === 'signature') && (
                <div className="bg-white/3 border-b border-border p-2 flex items-center gap-4 overflow-visible flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Font:</span>
                        <select
                            value={textOptions.font}
                            onChange={(e) => setTextOptions({ ...textOptions, font: e.target.value })}
                            className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm"
                        >
                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Size:</span>
                        <input
                            type="number"
                            value={textOptions.size}
                            onChange={(e) => setTextOptions({ ...textOptions, size: parseInt(e.target.value) })}
                            className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm w-16"
                            min={8} max={72}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Color:</span>
                        <ColorPicker
                            color={textOptions.color}
                            onChange={(c) => setTextOptions({ ...textOptions, color: c })}
                            presetColors={COLORS.slice(0, 8)}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setTextOptions({ ...textOptions, bold: !textOptions.bold })}
                            className={clsx("p-1.5 rounded", textOptions.bold ? "bg-primary text-white" : "hover:bg-white/10")}
                        >
                            <Bold size={16} />
                        </button>
                        <button
                            onClick={() => setTextOptions({ ...textOptions, italic: !textOptions.italic })}
                            className={clsx("p-1.5 rounded", textOptions.italic ? "bg-primary text-white" : "hover:bg-white/10")}
                        >
                            <Italic size={16} />
                        </button>
                    </div>
                </div>
            )}

            {file && (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') && (
                <div className="bg-white/3 border-b border-border p-2 flex items-center gap-4 overflow-visible flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Stroke:</span>
                        <ColorPicker
                            color={shapeOptions.stroke}
                            onChange={(c) => setShapeOptions({ ...shapeOptions, stroke: c })}
                            presetColors={COLORS.slice(0, 8)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Width:</span>
                        <input
                            type="range"
                            value={shapeOptions.strokeWidth}
                            onChange={(e) => setShapeOptions({ ...shapeOptions, strokeWidth: parseInt(e.target.value) })}
                            className="w-20"
                            min={1} max={10}
                        />
                        <span className="text-xs w-4">{shapeOptions.strokeWidth}</span>
                    </div>
                </div>
            )}

            {file && activeTool === 'draw' && (
                <div className="bg-white/3 border-b border-border p-2 flex items-center gap-4 overflow-visible flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Color:</span>
                        <ColorPicker
                            color={drawColor}
                            onChange={setDrawColor}
                            presetColors={COLORS.slice(0, 8)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Width:</span>
                        <input
                            type="range"
                            value={drawWidth}
                            onChange={(e) => setDrawWidth(parseInt(e.target.value))}
                            className="w-20"
                            min={1} max={10}
                        />
                        <span className="text-xs w-4">{drawWidth}</span>
                    </div>
                </div>
            )}

            {file && activeTool === 'highlight' && (
                <div className="bg-white/3 border-b border-border p-2 flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">Highlight Color:</span>
                    <ColorPicker
                        color={highlightColor}
                        onChange={setHighlightColor}
                        presetColors={HIGHLIGHT_COLORS}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Page Thumbnails Sidebar */}
                {file && showThumbnails && (
                    <div className="absolute z-10 h-full w-32 bg-neutral-900/95 border-r border-border overflow-y-auto p-2 space-y-2 shadow-xl md:relative md:bg-black/30 md:shadow-none">
                        {Object.entries(thumbnails).map(([pageNum, src]) => (
                            <button
                                key={pageNum}
                                onClick={() => setCurrentPage(parseInt(pageNum))}
                                className={clsx(
                                    "w-full rounded-lg overflow-hidden border-2 transition-all",
                                    currentPage === parseInt(pageNum) ? "border-primary shadow-lg shadow-primary/20" : "border-transparent hover:border-white/20"
                                )}
                            >
                                <img src={src} alt={`Page ${pageNum}`} className="w-full" />
                                <div className="text-xs text-center py-1 bg-black/50">{pageNum}</div>
                            </button>
                        ))}
                    </div>
                )}

                {/* PDF Canvas Area */}
                <div className="flex-1 bg-neutral-900/50 overflow-auto flex justify-center p-8" ref={containerRef}>
                    {!file ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <FileText size={64} className="mb-4 opacity-30" />
                            <p className="text-xl font-medium mb-2">No PDF Loaded</p>
                            <p className="text-sm opacity-50">Click "Open PDF" to get started</p>
                        </div>
                    ) : (
                        <div
                            className={clsx("relative shadow-2xl", activeTool === 'draw' ? "touch-none" : "")}
                            onMouseDown={startDrawing}
                            onTouchStart={startDrawing}
                            onMouseMove={(e) => { draw(e); handleDragMove(e); handleResizeMove(e); }}
                            onTouchMove={(e) => { draw(e); handleDragMove(e); handleResizeMove(e); }}
                            onMouseUp={(e) => { endDrawing(); handleDragEnd(); handleResizeEnd(); }}
                            onTouchEnd={(e) => { endDrawing(); handleDragEnd(); handleResizeEnd(); }}
                            onMouseLeave={(e) => { endDrawing(); handleDragEnd(); handleResizeEnd(); }}
                        >
                            <canvas
                                ref={canvasRef}
                                className="block bg-white"
                                style={{ cursor: isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : activeTool === 'draw' ? 'crosshair' : activeTool === 'select' ? 'default' : 'crosshair' }}
                                onClick={handleCanvasClick}
                            />
                            {/* Drawing canvas overlay */}
                            <canvas
                                ref={drawCanvasRef}
                                className="absolute inset-0 pointer-events-none"
                            />
                            {/* Overlays */}
                            <div className="absolute inset-0 pointer-events-none overflow-visible">
                                {(overlays[currentPage] || []).map(item => renderOverlayElement(item))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Status Bar */}
            {file && (
                <div className="bg-card border-t border-border p-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <button disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-1 hover:bg-white/10 rounded disabled:opacity-30">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-muted-foreground">Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span></span>
                        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-1 hover:bg-white/10 rounded disabled:opacity-30">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                        <span>Annotations: {(overlays[currentPage] || []).length}</span>
                        <span className="opacity-50">|</span>
                        <span>Ctrl+Z: Undo | Ctrl+Y: Redo | Del: Delete | Esc: Deselect</span>
                    </div>
                </div>
            )}
        </div>
    );
}
