import { Card } from "../components/Card";
import { CircleCheck, ChevronRight, FileText, Layout, Paintbrush, Presentation, Type } from "lucide-react";
import { clsx } from "clsx";

export function DesignSystem() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl pb-20">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 tracking-tight">Project Nereus Design System</h1>
        <p className="text-slate-500 mt-2 text-lg">Visual identity, UI guidelines, and creative direction for the coastal multi-sensor sensing buoy dashboard.</p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-4 border-b border-slate-800">
        {["1. Creative Direction", "2. Style Guide", "3. Dashboard UI", "4. Data Viz", "5. Posters & Comms"].map((tab, i) => (
          <button
            key={i}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              i === 0 ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            )}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* 1. CREATIVE DIRECTION */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <Paintbrush className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-slate-200">1. Creative Direction Options & Chosen Concept</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="opacity-75 grayscale hover:grayscale-0 transition-all border-slate-800">
            <h3 className="text-lg font-medium text-slate-300">Option A: "Research Institute Light"</h3>
            <p className="text-sm text-slate-500 mt-2">A stark, high-contrast light mode approach inspired by classic academic papers and minimal data-product SaaS. Feels highly accessible, institutional, and heavily reliant on white space and thin borders.</p>
          </Card>
          
          <Card className="border-cyan-500/30 bg-cyan-950/10 ring-1 ring-cyan-500/10">
            <div className="absolute top-2 right-2">
              <span className="bg-cyan-500/20 text-cyan-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-cyan-500/30">Chosen Direction</span>
            </div>
            <h3 className="text-lg font-medium text-cyan-400">Option B: "Deep Oceanic Technical" (Selected)</h3>
            <p className="text-sm text-slate-300 mt-2">
              A dark-mode, engineering-led interface inspired by sonar control rooms, acoustic signal analysis tools, and modern aerospace platforms.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><CircleCheck size={16} className="text-cyan-500" /> <strong>Mood:</strong> Serious, credible, advanced, focused.</li>
              <li className="flex gap-2"><CircleCheck size={16} className="text-cyan-500" /> <strong>Visual Inspiration:</strong> Marine tech, dark-mode technical instrumentation, spectrograms.</li>
              <li className="flex gap-2"><CircleCheck size={16} className="text-cyan-500" /> <strong>Why it fits:</strong> Reduces eye strain in low-light environments (vessels, labs). Makes glowing data (like spectrograms and anomalies) pop natively. Balances "engineering credibility" with "modern polished design" by avoiding childish blues and instead using deep slates and precise cyans.</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* 2. STYLE GUIDE */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <Type className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-slate-200">2. Complete Style Guide Board</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Colors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Color System</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded bg-slate-950 border border-slate-800"></div>
                  <span className="text-sm font-medium">Background Base</span>
                </div>
                <span className="text-xs font-mono text-slate-500">#0f172a (Slate 950)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded bg-slate-900 border border-slate-700"></div>
                  <span className="text-sm font-medium">Surface / Card</span>
                </div>
                <span className="text-xs font-mono text-slate-500">#1e293b (Slate 900)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-slate-900/50 border border-cyan-500/30">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded bg-cyan-500"></div>
                  <span className="text-sm font-medium text-cyan-400">Primary Accent</span>
                </div>
                <span className="text-xs font-mono text-slate-500">#06b6d4 (Cyan 500)</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mt-4">
                 <div className="flex flex-col gap-1">
                    <div className="h-2 w-full bg-emerald-500 rounded"></div>
                    <span className="text-[10px] font-mono text-slate-500 text-center">SUCCESS</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <div className="h-2 w-full bg-amber-500 rounded"></div>
                    <span className="text-[10px] font-mono text-slate-500 text-center">WARNING</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <div className="h-2 w-full bg-rose-500 rounded"></div>
                    <span className="text-[10px] font-mono text-slate-500 text-center">ERROR</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <div className="h-2 w-full bg-blue-500 rounded"></div>
                    <span className="text-[10px] font-mono text-slate-500 text-center">INFO</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Typography System</h3>
            <Card className="space-y-4 bg-slate-900">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Primary Sans (Inter) - UI & Prose</span>
                <h1 className="text-2xl font-semibold text-slate-100 tracking-tight mt-1">Inter Semi-Bold</h1>
                <p className="text-sm text-slate-400 mt-1">Used for headings, readable paragraphs, button text, and general interface labels.</p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Monospace (JetBrains Mono) - Data & Code</span>
                <div className="text-lg font-mono text-cyan-400 mt-1">45.23° N, 14.11° W</div>
                <p className="text-sm text-slate-400 mt-1">Strictly used for sensor values, coordinates, timestamps, and technical IDs.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. VISUAL LANGUAGE */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <Layout className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-slate-200">3. Dashboard Visual Language Rules</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card title="Layout & Structure" className="text-sm text-slate-400 space-y-2">
             <p><strong>Grid:</strong> 12-column flexbox/grid layout. Dense padding (16px to 24px) to maximize data density without feeling cluttered.</p>
             <p><strong>Cards:</strong> Minimal borders (Slate 800), subtle blurred backgrounds (backdrop-blur-xl), slight shadows to elevate from the very dark canvas.</p>
           </Card>
           <Card title="Visual Priority" className="text-sm text-slate-400 space-y-2">
             <p>1. Status & Anomalies (Highest contrast, pulse animations)</p>
             <p>2. Live Sensor Data (Large typography, Monospace)</p>
             <p>3. Charts & Graphs (Restrained lines, muted grids)</p>
             <p>4. Labels & Chrome (Low contrast, Slate 500)</p>
           </Card>
           <Card title="Aesthetics & Accents" className="text-sm text-slate-400 space-y-2">
             <p>Avoid solid filled boxes. Prefer 10% opacity backgrounds with 20% opacity borders for badges and interactive elements.</p>
             <p>Use horizontal gradients sparingly at the top of cards to indicate selection or priority.</p>
           </Card>
        </div>
      </section>

      {/* 4. POSTERS & SLIDES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <Presentation className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-slate-200">4. Poster & Presentation Translation</h2>
        </div>
        
        <div className="prose prose-invert prose-sm max-w-none text-slate-400">
          <p>The dark-mode dashboard cannot always translate directly to print or brightly lit lecture halls. Here are the rules for extending the system to posters and slides:</p>
          
          <ul className="space-y-2 mt-4">
            <li><strong>Theme Inversion:</strong> For printed posters, invert the background to white/off-white (Slate 50). Borders become Slate 200. Text becomes Slate 900.</li>
            <li><strong>Accent Preservation:</strong> The Cyan 500 accent remains identical in both light and dark modes, acting as the brand anchor.</li>
            <li><strong>Chart Export Styling:</strong> Charts must be exported with transparent backgrounds. Gridlines must be explicitly thickened (0.5pt to 1pt) for projector visibility. Ensure axis labels are bumped up by at least +4pt.</li>
            <li><strong>Section Headers:</strong> On posters, use a solid Cyan left-border (4px wide) to denote new sections, mimicking the dashboard card tops.</li>
            <li><strong>Typography Scale:</strong> Dashboard uses 12-24px. Posters should scale Inter to 32px (body) and 72px+ (titles), maintaining JetBrains Mono for figures and captions.</li>
          </ul>
        </div>
      </section>

      {/* 5. BRANDING */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <FileText className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-slate-200">5. Project Branding Guidance</h2>
        </div>
        
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex flex-col md:flex-row gap-8 items-center">
             <div className="flex-1 space-y-4 text-sm text-slate-400">
               <p><strong>Identity Feel:</strong> The project brand should feel institutional but forward-looking. Avoid cartoonish fish, anchors, or water drops. Focus on geometry, sine waves, signal processing, and depth.</p>
               <p><strong>Recommended Motif:</strong> A stylized representation of a spectrogram or a multi-frequency wave. A clean sans-serif logotype tracking slightly wide (e.g. "N E R E U S").</p>
               <p><strong>Textures:</strong> Use subtle data-point grids, contour map lines, or faint sonar sweep circles in backgrounds for pitch decks, never overpowering the content.</p>
             </div>
             <div className="w-48 h-48 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
               <div className="absolute inset-0 flex items-center justify-center opacity-20">
                 <div className="w-full h-px bg-cyan-500"></div>
                 <div className="absolute w-px h-full bg-cyan-500"></div>
                 <div className="absolute w-32 h-32 rounded-full border border-cyan-500"></div>
                 <div className="absolute w-48 h-48 rounded-full border border-cyan-500"></div>
               </div>
               <div className="relative text-cyan-400 font-mono font-bold tracking-widest text-lg z-10 bg-slate-950 px-2 py-1">
                 NEREUS
               </div>
             </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
