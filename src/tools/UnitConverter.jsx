import React, { useState } from 'react';
import { Ruler, Scale, Thermometer, ArrowRightLeft } from 'lucide-react';

const units = { length: { meters: 1, feet: 0.3048, inches: 0.0254, kilometers: 1000, miles: 1609.34, centimeters: 0.01 }, weight: { kilograms: 1, pounds: 0.453592, ounces: 0.0283495, grams: 0.001, metric_tons: 1000 }, temperature: { celsius: 'C', fahrenheit: 'F', kelvin: 'K' } };

export default function UnitConverter() {
    const [category, setCategory] = useState('length');
    const [from, setFrom] = useState('meters');
    const [to, setTo] = useState('feet');
    const [value, setValue] = useState(1);

    const convert = () => {
        if (category === 'temperature') {
            let celsius;
            if (from === 'celsius') celsius = value;
            else if (from === 'fahrenheit') celsius = (value - 32) * 5 / 9;
            else celsius = value - 273.15;
            if (to === 'celsius') return celsius;
            if (to === 'fahrenheit') return (celsius * 9 / 5) + 32;
            return celsius + 273.15;
        }
        const valInBase = value * units[category][from];
        return valInBase / units[category][to];
    };

    const result = convert().toFixed(4);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-4 md:p-8 shadow-xl">
                <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center gap-2">
                    <ArrowRightLeft className="text-primary" /> Unit Converter
                </h2>
                <div className="flex gap-1 md:gap-2 mb-6 md:mb-8 bg-black/20 p-1 rounded-lg">
                    {(['length', 'weight', 'temperature']).map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setCategory(cat); setFrom(Object.keys(units[cat])[0]); setTo(Object.keys(units[cat])[1]); }}
                            className={`flex-1 py-2 md:py-3 rounded-md flex items-center justify-center gap-1 md:gap-2 font-medium transition-all text-sm md:text-base ${category === cat ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-white/5 text-muted-foreground'}`}
                        >
                            {cat === 'length' && <Ruler size={16} className="md:w-[18px] md:h-[18px]" />}
                            {cat === 'weight' && <Scale size={16} className="md:w-[18px] md:h-[18px]" />}
                            {cat === 'temperature' && <Thermometer size={16} className="md:w-[18px] md:h-[18px]" />}
                            <span className="capitalize hidden sm:inline">{cat}</span>
                            <span className="capitalize sm:hidden">{cat.slice(0, 4)}</span>
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-end">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block capitalize">From {from}</label>
                        <div className="flex flex-col gap-3 md:gap-4">
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => setValue(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 md:px-4 py-3 md:py-4 text-lg md:text-xl font-bold focus:border-primary outline-none"
                            />
                            <select
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 md:px-4 py-2 text-sm outline-none capitalize text-white"
                            >
                                {Object.keys(units[category]).map(u => <option key={u} value={u} className="bg-slate-900 text-white">{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block capitalize">To {to}</label>
                        <div className="flex flex-col gap-3 md:gap-4">
                            <div className="w-full bg-primary/5 border border-primary/20 rounded-lg px-3 md:px-4 py-3 md:py-4 text-lg md:text-xl font-bold text-primary">{result}</div>
                            <select
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 md:px-4 py-2 text-sm outline-none capitalize text-white"
                            >
                                {Object.keys(units[category]).map(u => <option key={u} value={u} className="bg-slate-900 text-white">{u}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
