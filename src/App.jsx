import React, { useState, Suspense, lazy } from 'react';
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
  ExternalLink,
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const CurrentTool = tools.find(t => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 border-r border-border bg-card flex flex-col z-20`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className={`font-black text-2xl text-primary tracking-tighter ${!sidebarOpen && 'hidden'}`}>Moufy Tools</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-white/5 text-muted-foreground'}`}
          >
            <LayoutDashboard size={20} />
            {sidebarOpen && <span className="font-semibold">Dashboard</span>}
          </button>

          <div className={`mt-8 mb-4 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-50 ${!sidebarOpen && 'hidden'}`}>Utilities</div>

          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tool.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'hover:bg-white/5 text-muted-foreground'}`}
            >
              <tool.icon size={20} className={activeTab === tool.id ? tool.color : 'text-inherit'} />
              {sidebarOpen && <span className="font-medium">{tool.name}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4">
            <AdSpace type="sidebar" />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-center px-8">
          <AdSpace type="top-banner" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'dashboard' ? (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="mb-12">
                <h2 className="text-4xl font-black mb-2 tracking-tight">Welcome, Toolmaster.</h2>
                <p className="text-muted-foreground text-lg">Pick a tool below to get started. All processing is 100% local.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    className="group bg-card border border-border rounded-2xl p-6 text-left hover:border-primary/50 hover:bg-white/5 transition-all hover:scale-[1.02] active:scale-95 shadow-xl relative overflow-hidden"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-white/5 group-hover:bg-primary/20 transition-colors`}>
                      <tool.icon className={`${tool.color} group-hover:scale-110 transition-transform`} size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{tool.desc}</p>
                    <div className="flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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

        <footer className="h-20 border-t border-border bg-card/50 backdrop-blur-xl flex items-center justify-center px-8 shrink-0">
          <AdSpace type="bottom-banner" />
        </footer>
      </main>
    </div>
  );
}
