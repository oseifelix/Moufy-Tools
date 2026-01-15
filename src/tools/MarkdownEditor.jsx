import React, { useState, useEffect } from 'react';
import { FileType, Eye, Code, Copy, Check, Loader2 } from 'lucide-react';
import { loadScript } from '../utils/scriptLoader';

export default function MarkdownEditor() {
    const [markdown, setMarkdown] = useState(`# Welcome to Moufy Editor\n\nStart typing **Markdown** on the left!\n\n- Support for lists\n- **Bold** and *Italic*\n- [Links](https://example.com)\n- And code blocks:\n\n\`\`\`javascript\nconsole.log('Hello World');\n\`\`\`\n`);
    const [html, setHtml] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js')
            .then(() => { setIsReady(true); if (window.marked) setHtml(window.marked.parse(markdown)); })
            .catch(console.error);
    }, []);

    useEffect(() => { if (isReady && window.marked) setHtml(window.marked.parse(markdown)); }, [markdown, isReady]);

    if (!isReady) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /> <span className="ml-2">Loading Markdown Engine...</span></div>;

    return (
        <div className="min-h-[60vh] md:h-[80vh] flex flex-col">
            <div className="bg-card border border-border p-3 md:p-4 flex items-center justify-between rounded-t-xl"><h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><FileType className="text-primary" /> Markdown Editor</h2><button onClick={() => { navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-xs md:text-sm">{copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy Raw'}</button></div>
            <div className="flex-1 flex flex-col md:flex-row border-x border-b border-border rounded-b-xl overflow-hidden bg-background">
                <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border min-h-[200px] md:min-h-[300px]"><div className="bg-white/5 px-3 md:px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Code size={14} /> Input</div><textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} className="flex-1 bg-transparent p-3 md:p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed" placeholder="Type your markdown here..." /></div>
                <div className="flex-1 flex flex-col min-h-[200px] md:min-h-[300px]"><div className="bg-white/5 px-3 md:px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Eye size={14} /> Preview</div><div className="flex-1 p-4 md:p-8 prose prose-invert max-w-none overflow-y-auto" dangerouslySetInnerHTML={{ __html: html }} /></div>
            </div>
        </div>
    );
}
