import React, { useState } from 'react';
import { Shield, Copy, Check, RefreshCw, Hash, Type, Star } from 'lucide-react';

export default function PasswordGen() {
    const [length, setLength] = useState(16);
    const [useSymbols, setUseSymbols] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useUpper, setUseUpper] = useState(true);
    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);

    const generate = () => {
        let charset = 'abcdefghijklmnopqrstuvwxyz';
        if (useUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useNumbers) charset += '0123456789';
        if (useSymbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';
        let res = '';
        for (let i = 0; i < length; i++) res += charset.charAt(Math.floor(Math.random() * charset.length));
        setPassword(res);
    };

    React.useEffect(generate, []);

    return (
        <div className="max-w-xl mx-auto"><div className="bg-card border border-border rounded-xl p-8 shadow-xl"><h2 className="text-2xl font-bold mb-8 flex items-center gap-2"><Shield className="text-primary" /> Password Generator</h2><div className="relative group mb-8"><input type="text" readOnly value={password} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 pr-14 font-mono text-xl text-primary-foreground focus:outline-none" /><button onClick={() => { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors">{copied ? <Check className="text-green-400" /> : <Copy className="text-muted-foreground" />}</button></div><div className="space-y-6"><div className="space-y-4"><label className="flex justify-between font-medium"><span>Password Length</span><span className="text-primary">{length}</span></label><input type="range" min="8" max="64" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={() => setUseUpper(!useUpper)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${useUpper ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-muted-foreground'}`}><Type size={20} /> <span className="font-semibold">Uppercase</span></button><button onClick={() => setUseNumbers(!useNumbers)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${useNumbers ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-muted-foreground'}`}><Hash size={20} /> <span className="font-semibold">Numbers</span></button><button onClick={() => setUseSymbols(!useSymbols)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${useSymbols ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-muted-foreground'}`}><Star size={20} /> <span className="font-semibold">Symbols</span></button></div><button onClick={generate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"><RefreshCw size={20} /> Generate New Password</button></div></div></div>
    );
}
