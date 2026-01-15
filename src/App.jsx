import React, { useState, Suspense, lazy, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Video,
  Image as ImageIcon,
  Scissors,
  ScanText,
  ArrowRightLeft,
  FileType,
  Shield,
  QrCode,
  Archive,
  Menu,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import AdSpace from './components/AdSpace';

// Lazy load tools for performance
const PdfSuite = lazy(() => import('./tools/PdfSuite'));
const VideoCompressor = lazy(() => import('./tools/VideoCompressor'));
const HeicConverter = lazy(() => import('./tools/HeicConverter'));
const BgRemover = lazy(() => import('./tools/BgRemover'));
const ImageOcr = lazy(() => import('./tools/ImageOcr'));
const UnitConverter = lazy(() => import('./tools/UnitConverter'));
const MarkdownEditor = lazy(() => import('./tools/MarkdownEditor'));
const PasswordGen = lazy(() => import('./tools/PasswordGen'));
const QrGenerator = lazy(() => import('./tools/QrGenerator'));
const FileZipper = lazy(() => import('./tools/FileZipper'));

const tools = [
  { id: 'pdf', name: 'Pro PDF Suite', icon: FileText, component: PdfSuite, color: 'text-blue-400', desc: 'Edit, Convert & View' },
  { id: 'video', name: 'Video Compressor', icon: Video, component: VideoCompressor, color: 'text-purple-400', desc: 'WASM Powered' },
  { id: 'heic', name: 'HEIC to JPG', icon: ImageIcon, component: HeicConverter, color: 'text-green-400', desc: 'Batch Convert' },
  { id: 'bg', name: 'Background Remover', icon: Scissors, component: BgRemover, color: 'text-red-400', desc: 'AI Object Removal' },
  { id: 'ocr', name: 'Image to Text', icon: ScanText, component: ImageOcr, color: 'text-yellow-400', desc: 'Local OCR' },
  { id: 'convert', name: 'Unit Converter', icon: ArrowRightLeft, component: UnitConverter, color: 'text-cyan-400', desc: 'All Measurements' },
  { id: 'md', name: 'Markdown Editor', icon: FileType, component: MarkdownEditor, color: 'text-indigo-400', desc: 'Live Preview' },
  { id: 'pass', name: 'Password Generator', icon: Shield, component: PasswordGen, color: 'text-orange-400', desc: 'Secure & Strong' },
  { id: 'qr', name: 'QR Code Generator', icon: QrCode, component: QrGenerator, color: 'text-pink-400', desc: 'Instant Creation' },
  { id: 'zip', name: 'File Zipper', icon: Archive, component: FileZipper, color: 'text-slate-400', desc: 'Client Side Zipping' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On desktop, keep sidebar open by default
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle tool selection - close sidebar on mobile
  const handleToolSelect = (toolId) => {
    setActiveTab(toolId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const CurrentTool = tools.find(t => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          ${sidebarOpen ? 'w-64' : 'md:w-20'} 
          fixed md:relative h-full
          transition-all duration-300 ease-in-out
          border-r border-border bg-card flex flex-col z-40
          w-64
        `}
      >
        <div className="p-4 md:p-6 flex items-center justify-between">
          <h1 className={`font-black text-xl md:text-2xl text-primary tracking-tighter ${!sidebarOpen && !isMobile && 'md:hidden'}`}>
            Moufy Tools
          </h1>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 hover:bg-white/5 rounded-lg"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 md:px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => handleToolSelect('dashboard')}
            className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-white/5 text-muted-foreground'}`}
          >
            <LayoutDashboard size={20} />
            {(sidebarOpen || isMobile) && <span className="font-semibold">Dashboard</span>}
          </button>

          <div className={`mt-6 md:mt-8 mb-3 md:mb-4 px-3 md:px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-50 ${(!sidebarOpen && !isMobile) && 'md:hidden'}`}>
            Utilities
          </div>

          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl transition-all ${activeTab === tool.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'hover:bg-white/5 text-muted-foreground'}`}
            >
              <tool.icon size={20} className={activeTab === tool.id ? tool.color : 'text-inherit'} />
              {(sidebarOpen || isMobile) && <span className="font-medium text-sm md:text-base">{tool.name}</span>}
            </button>
          ))}
        </nav>

        {(sidebarOpen || isMobile) && (
          <div className="p-4 hidden md:block">
            <AdSpace type="sidebar" />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-12 md:h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-3 md:px-8">
          {/* Mobile hamburger menu */}
          <button 
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-white/5 rounded-lg -ml-1"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Mobile title */}
          <h1 className="md:hidden font-bold text-lg text-primary">Moufy Tools</h1>

          {/* Ad space - hidden on mobile */}
          <div className="hidden md:flex flex-1 justify-center">
            <AdSpace type="top-banner" />
          </div>

          {/* Empty spacer for mobile layout balance */}
          <div className="md:hidden w-10" />
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-8 custom-scrollbar">
          {activeTab === 'dashboard' ? (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="mb-6 md:mb-12">
                <h2 className="text-2xl md:text-4xl font-black mb-2 tracking-tight">Welcome, Toolmaster.</h2>
                <p className="text-muted-foreground text-sm md:text-lg">Pick a tool below to get started. All processing is 100% local.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className="group bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 text-left hover:border-primary/50 hover:bg-white/5 transition-all hover:scale-[1.02] active:scale-95 shadow-xl relative overflow-hidden"
                  >
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-6 bg-white/5 group-hover:bg-primary/20 transition-colors`}>
                      <tool.icon className={`${tool.color} group-hover:scale-110 transition-transform`} size={20} />
                    </div>
                    <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 leading-tight">{tool.name}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4 hidden sm:block">{tool.desc}</p>
                    <div className="hidden sm:flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Open tool <ChevronRight size={14} className="ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto h-full animate-in zoom-in-95 duration-300">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={48} /></div>}>
                {CurrentTool && <CurrentTool />}
              </Suspense>
            </div>
          )}
        </div>

        {/* Footer - hidden on mobile for more content space */}
        <footer className="hidden md:flex h-20 border-t border-border bg-card/50 backdrop-blur-xl items-center justify-center px-8 shrink-0">
          <AdSpace type="bottom-banner" />
        </footer>
      </main>
    </div>
  );
}
