import React from 'react';

const AdSpace = ({ type }) => {
    const styles = {
        sidebar: "w-full aspect-[4/5] bg-white/5 border border-dashed border-white/20 rounded-xl flex items-center justify-center p-4 text-center",
        'top-banner': "w-full max-w-4xl h-full bg-white/5 border border-dashed border-white/20 rounded-lg flex items-center justify-center px-4 text-center",
        'bottom-banner': "w-full max-w-4xl h-full bg-white/5 border border-dashed border-white/20 rounded-lg flex items-center justify-center px-4 text-center"
    };

    return (
        <div className={styles[type] || styles.sidebar}>
            <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-white/20">Sponsored</p>
                <p className="text-xs font-bold text-muted-foreground opacity-30 hidden md:block">{type.replace('-', ' ').toUpperCase()} AD</p>
            </div>
            {/* 
        Google AdSense Implementation:
        <ins className="adsbygoogle" ... />
      */}
        </div>
    );
};

export default AdSpace;
