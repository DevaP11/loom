'use client'
import React, { useState, useRef } from 'react';
import {
  Layers, UploadCloud, ShieldCheck, Download, Plus, FileJson,
  PlusCircle, HardDrive, Edit3, Sparkles, Copy, XCircle, 
  CheckCircle, GitMerge, Info, GitPullRequest, X, ArrowRight
} from 'lucide-react';

export default function JsonNexus() {
  // --- Initial Data Mocks ---
  const initialFiles = {
    'config_prod.json': JSON.stringify({
      project_id: "nexus-core-778",
      version: "2.4.1",
      environment: "production",
      features: {
        realtime_updates: true,
        caching_layer: true,
        compression_level: 9
      },
      endpoints: [
        "https://api.nexus.io/v1",
        "https://backup.nexus.io/v1"
      ],
      metadata: { owner: "dev_ops_admin" }
    }, null, 2),
    'user_schema.json': JSON.stringify({
      type: "object",
      properties: { user_id: { type: "string" }, role: { type: "string" } }
    }, null, 2),
    'local_overrides.json': JSON.stringify({
      environment: "staging",
      debug_mode: true
    }, null, 2)
  };

  // --- State Management ---
  const [activeTab, setActiveTab] = useState('editor');
  const [fileData, setFileData] = useState(initialFiles);
  const [activeFile, setActiveFile] = useState('config_prod.json');
  const [jsonContent, setJsonContent] = useState(initialFiles['config_prod.json']);
  const fileInputRef = useRef(null);

  // Merge Flow State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetSource, setTargetSource] = useState('');
  const [mergeConflicts, setMergeConflicts] = useState([]);
  const [isComparing, setIsComparing] = useState(false);

  // --- Syntax Highlighting Logic ---
  const highlightJSON = (jsonString) => {
    if (!jsonString) return "";
    
    // Escape HTML to prevent injection and rendering issues
    let html = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Match JSON tokens and apply colors based on your specific screenshot
    return html.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'text-white'; 
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // Key - Lavender Purple
          return `<span class="text-[#A390E4]">${match.replace(/\s*:$/, '')}</span><span class="text-white">:</span>`;
        } else {
          // String Value - White
          cls = 'text-white'; 
        }
      } else if (/true|false|null/.test(match)) {
        // Boolean / Null - Pink
        cls = 'text-[#EA7FD6]'; 
      } else {
        // Number - Pink
        cls = 'text-[#EA7FD6]'; 
      }
      return `<span class="${cls}">${match}</span>`;
    });
  };

  // --- File Navigation Logic ---
  const handleFileSelect = (fileName) => {
    setFileData(prev => ({ ...prev, [activeFile]: jsonContent }));
    setActiveFile(fileName);
    setJsonContent(fileData[fileName] || "{\n  \n}");
    
    if (isComparing) {
      setIsComparing(false);
      setMergeConflicts([]);
    }
  };

  // --- Merge & Diff Logic ---
  const handleStartCompare = () => {
    if (!targetSource) return;
    setIsModalOpen(false);
    setIsComparing(true);
    setActiveTab('merge');

    setMergeConflicts([
      { 
        id: 'c1', type: 'modify', 
        targetKey: '"environment": "production"', replacement: '"environment": "staging"', 
        displayOld: '- "environment": "production",', displayNew: '+ "environment": "staging",' 
      },
      { 
        id: 'c2', type: 'add', 
        targetKey: '{\n  "project_id"', replacement: '{\n  "debug_mode": true,\n  "project_id"', 
        displayNew: '+ "debug_mode": true,' 
      },
      { 
        id: 'c3', type: 'remove', 
        targetKey: ',\n      "compression_level": 9', replacement: '', 
        displayOld: '- "compression_level": 9' 
      }
    ]);
  };

  const acceptChange = (conflict) => {
    const updatedContent = jsonContent.replace(conflict.targetKey, conflict.replacement);
    setJsonContent(updatedContent);
    setFileData(prev => ({ ...prev, [activeFile]: updatedContent }));
    setMergeConflicts(prev => prev.filter(c => c.id !== conflict.id));
  };

  const rejectChange = (id) => {
    setMergeConflicts(prev => prev.filter(c => c.id !== id));
  };

  const applyAllChanges = () => {
    let updatedContent = jsonContent;
    mergeConflicts.forEach(conflict => {
      updatedContent = updatedContent.replace(conflict.targetKey, conflict.replacement);
    });
    setJsonContent(updatedContent);
    setFileData(prev => ({ ...prev, [activeFile]: updatedContent }));
    setMergeConflicts([]);
  };

  // --- Editor Utilities ---
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert("Invalid JSON: Cannot format.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
    } catch (err) {
      alert("Failed to copy text.");
    }
  };

  const handleAddFile = () => {
    const fileName = prompt("Enter new file name (e.g., data.json):");
    if (fileName && !fileData[fileName]) {
      const emptyJson = "{\n  \n}";
      setFileData(prev => ({ ...prev, [fileName]: emptyJson }));
      handleFileSelect(fileName);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#2B1354] text-white font-sans relative">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&f[]=jet-brains-mono@500,400&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234,127,214,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #EA7FD6; }
        .light-scrollbar::-webkit-scrollbar-thumb { background: #9AB5E7; }
        .light-scrollbar::-webkit-scrollbar-thumb:hover { background: #2B1354; }
        .editor-font { font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.7; }
      `}} />

      {/* TARGET SOURCE MODAL */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-[#1A0C33]/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#EAEAEC] w-96 rounded-xl shadow-2xl border border-[#9AB5E7]/30 overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-white border-b border-[#9AB5E7]/20">
              <h2 className="text-[#2B1354] font-bold text-sm">Select Target Source</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#9AB5E7] hover:text-[#EA7FD6] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-[#2B1354]/70">Choose a project file to compare against <strong>{activeFile}</strong>:</p>
              <select 
                className="w-full p-2.5 rounded-md border border-[#9AB5E7]/30 bg-white text-[#2B1354] text-sm focus:outline-none focus:border-[#EA7FD6]"
                value={targetSource}
                onChange={(e) => setTargetSource(e.target.value)}
              >
                <option value="" disabled>Select a file...</option>
                {Object.keys(fileData).filter(f => f !== activeFile).map(file => (
                  <option key={file} value={file}>{file}</option>
                ))}
              </select>
              <button 
                onClick={handleStartCompare}
                disabled={!targetSource}
                className="w-full py-2.5 mt-2 bg-[#EA7FD6] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2B1354] text-white hover:text-[#EA7FD6] text-xs font-bold rounded-md shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <GitPullRequest className="w-4 h-4" /> Compare Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="h-14 shrink-0 border-b border-[#9AB5E7]/20 bg-[#2B1354] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#EA7FD6] rounded-lg flex items-center justify-center shadow-lg shadow-[#EA7FD6]/20">
              <Layers className="text-[#2B1354] w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white hidden sm:block" style={{ fontFamily: 'Satoshi' }}>
              <span className="text-[#EA7FD6]">Loom</span>
            </h1>
          </div>
          <div className="h-8 w-px bg-[#9AB5E7]/20 mx-2 hidden sm:block"></div>
          
          <div className="flex items-center gap-1 bg-[#1A0C33] rounded-md p-1">
            <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'editor' ? 'bg-[#EA7FD6] text-[#2B1354]' : 'text-[#9AB5E7] hover:text-white'}`}>Editor</button>
            <button onClick={() => setActiveTab('merge')} className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'merge' ? 'bg-[#EA7FD6] text-[#2B1354]' : 'text-[#9AB5E7] hover:text-white'}`}>Merge Flow</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#1A0C33] hover:bg-[#EA7FD6] hover:text-[#2B1354] text-[#9AB5E7] rounded-md transition-all border border-[#9AB5E7]/20">
            <UploadCloud className="w-4 h-4" /> Upload JSON
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-[#EA7FD6] hover:bg-[#FFFFFF] text-[#2B1354] rounded-md transition-all shadow-lg shadow-[#EA7FD6]/20">
            <Download className="w-4 h-4" /> Export Result
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        
        {/* LEFT SIDEBAR - PROJECT FILES */}
        <aside className="w-full lg:w-[280px] border-r border-[#9AB5E7]/20 flex flex-col bg-[#F3F4F6] shrink-0 hidden md:flex">
          <div className="p-5 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-[#2B1354]/60 font-bold">Project Files</span>
            <button onClick={handleAddFile} className="p-1 text-[#EA7FD6] hover:text-[#2B1354] transition-colors rounded">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar light-scrollbar px-3">
            <div className="space-y-1.5">
              {Object.keys(fileData).map((file) => {
                // Apply specific styling logic based on the image reference
                const isActive = activeFile === file;

                return (
                  <div 
                    key={file}
                    onClick={() => handleFileSelect(file)}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-white shadow-sm border border-transparent' 
                        : 'hover:bg-white/60 border border-transparent hover:border-[#9AB5E7]/20 text-[#2B1354]/70'
                    }`}
                  >
                    <span className={`text-[13px] ${isActive ? 'font-semibold text-[#3A588E]' : ''}`}>
                      {file}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 px-2">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#9AB5E7]/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 group hover:border-[#EA7FD6] hover:bg-white/40 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-8 h-8 text-[#9AB5E7] group-hover:text-[#EA7FD6]" />
                <p className="text-xs text-center text-[#2B1354]/60 leading-relaxed">
                  Drop files here or<br/>
                  <span className="text-[#EA7FD6] font-bold">browse local</span>
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER - EDITOR */}
        <section className="flex-1 flex flex-col bg-[#2A184D] min-w-0">
          <div className="h-12 border-b border-[#9AB5E7]/10 flex items-center px-4 bg-[#231244] justify-between shadow-sm z-10">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#9AB5E7]">
              <Edit3 className="w-4 h-4 text-[#EA7FD6]" />
              <span className="text-white ml-1">{activeFile}</span>
              <span className="text-[#9AB5E7]/30 mx-1">/</span>
              <span className="text-white/40">Editor</span>
            </div>
            <div className="flex gap-4">
              <button onClick={handleFormat} className="text-[11px] font-bold text-[#9AB5E7] hover:text-[#EA7FD6] transition-colors flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> Format
              </button>
              <button onClick={handleCopy} className="text-[11px] font-bold text-[#9AB5E7] hover:text-[#EA7FD6] transition-colors flex items-center gap-1.5 uppercase tracking-wide">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex overflow-hidden">
             {/* Line Numbers */}
             <div className="w-14 pt-6 pb-20 bg-[#2A184D] flex flex-col items-end pr-4 border-r border-[#9AB5E7]/10 select-none overflow-hidden text-[#716194] editor-font shrink-0">
               {jsonContent.split('\n').map((_, i) => (
                 <div key={i}>{i + 1}</div>
               ))}
            </div>

            {/* Custom Overlay Code Editor */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <div className="relative min-h-full w-full editor-font">
                {/* Highlighted Read-Only Output */}
                <pre 
                  className="pointer-events-none whitespace-pre m-0 p-6 pb-32"
                  dangerouslySetInnerHTML={{ __html: highlightJSON(jsonContent) }}
                />
                
                {/* Transparent Editable Textarea */}
                <textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  spellCheck="false"
                  className="absolute top-0 left-0 w-full h-full p-6 pb-32 bg-transparent text-transparent caret-white resize-none outline-none whitespace-pre m-0 border-none focus:ring-0 overflow-hidden"
                />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR - MERGE EDITOR */}
        <aside className={`w-full lg:w-[400px] border-l border-[#9AB5E7]/20 flex flex-col bg-[#F3F4F6] shrink-0 transition-all ${activeTab === 'merge' ? 'flex' : 'hidden xl:flex'}`}>
          <div className="h-12 border-b border-[#9AB5E7]/20 flex items-center justify-between px-4 bg-white/60">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#2B1354]">Merge Editor</h3>
            {isComparing && (
              <div className="flex gap-1.5">
                <span className="flex items-center text-[11px] bg-[#EA7FD6]/10 text-[#EA7FD6] font-medium px-2 py-0.5 rounded border border-[#EA7FD6]/20">
                  +{mergeConflicts.filter(c => c.type === 'add' || c.type === 'modify').length}
                </span>
                <span className="flex items-center text-[11px] bg-[#2B1354]/10 text-[#2B1354] font-medium px-2 py-0.5 rounded border border-[#2B1354]/20">
                  -{mergeConflicts.filter(c => c.type === 'remove' || c.type === 'modify').length}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar light-scrollbar p-5 space-y-4">
            
            {!isComparing ? (
              // Empty State for Merge
              <div className="bg-white rounded-xl p-8 border border-[#9AB5E7]/30 shadow-sm flex flex-col items-center text-center gap-5 h-full justify-center">
                <div className="w-16 h-16 bg-[#9AB5E7]/10 rounded-full flex items-center justify-center mb-2">
                  <GitMerge className="w-8 h-8 text-[#EA7FD6]" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#2B1354] mb-2">Ready to Merge</h4>
                  <p className="text-[13px] text-[#2B1354]/60 max-w-[250px] leading-relaxed">Select another project file to compare changes against <strong>{activeFile}</strong>.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 mt-4 bg-white hover:bg-[#F3F4F6] text-[#EA7FD6] hover:text-[#2B1354] text-sm font-bold rounded-lg transition-colors border-2 border-[#EA7FD6]/30 shadow-sm flex justify-center items-center gap-2"
                >
                  Select Target Source <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Active Diff Editor
              <div className="bg-white rounded-xl p-4 border border-[#9AB5E7]/40 shadow-md">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#9AB5E7]/20">
                  <span className="text-[11px] font-bold text-[#2B1354] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EA7FD6] animate-pulse"></span>
                    Proposed Changes
                  </span>
                  {mergeConflicts.length > 0 && (
                    <button onClick={applyAllChanges} className="text-[11px] font-bold text-white bg-[#EA7FD6] px-3 py-1.5 rounded-md shadow-sm hover:bg-[#2B1354] transition-colors">
                      Accept All
                    </button>
                  )}
                </div>

                <div className="space-y-4 editor-font text-[13px]">
                  {mergeConflicts.length === 0 ? (
                    <div className="py-10 text-center text-sm text-[#2B1354]/50 font-sans">No conflicts remaining.</div>
                  ) : (
                    mergeConflicts.map(conflict => (
                      <div key={conflict.id} className="rounded-lg border border-[#9AB5E7]/30 overflow-hidden shadow-sm bg-[#FAFAFA]">
                        
                        {(conflict.type === 'modify' || conflict.type === 'remove') && (
                          <div className="p-3 bg-[#2B1354]/5 border-l-2 border-[#2B1354]/50 flex justify-between items-center text-[#2B1354]/70 line-through whitespace-pre-wrap">
                            <span>{conflict.displayOld}</span>
                          </div>
                        )}
                        
                        {(conflict.type === 'modify' || conflict.type === 'add') && (
                          <div className="p-3 bg-[#EA7FD6]/10 border-l-2 border-[#EA7FD6] flex justify-between items-center text-[#EA7FD6] font-medium whitespace-pre-wrap">
                            <span>{conflict.displayNew}</span>
                          </div>
                        )}
                        
                        <div className="bg-[#E5E7EB]/50 p-2 flex justify-end gap-2 border-t border-[#9AB5E7]/20">
                          <button onClick={() => acceptChange(conflict)} className="px-2 py-1 text-[#EA7FD6] hover:bg-white rounded flex items-center gap-1.5 text-[11px] font-bold transition-colors">
                            <CheckCircle className="w-4 h-4" /> Accept
                          </button>
                          <button onClick={() => rejectChange(conflict.id)} className="px-2 py-1 text-[#2B1354]/60 hover:text-[#2B1354] hover:bg-white rounded flex items-center gap-1.5 text-[11px] font-bold transition-colors">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/** FOOTER */}
      <footer className="h-6 shrink-0 border-t border-[#9AB5E7]/10 bg-[#2B1354] flex items-center justify-between px-3 text-[10px] text-[#9AB5E7] font-mono">
        <span>UTF-8 • JSON • Active</span>
        <div className="flex items-center gap-4">
          <span>Mem: {new Blob([jsonContent]).size} Bytes</span>
          <span className="flex items-center gap-1 text-[#EA7FD6]">
            <span className="w-1.5 h-1.5 bg-[#EA7FD6] rounded-full animate-pulse"></span>
            Connected
          </span>
        </div>
      </footer>
    </div>
  );
}