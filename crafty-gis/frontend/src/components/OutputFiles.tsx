import React from 'react';
import { OutputFile } from '../App';
import { Download, FileText, Image, Table, FileJson, HardDrive } from 'lucide-react';

interface OutputFilesProps {
  files: OutputFile[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcons: Record<string, React.ReactNode> = {
  'Raster': <Image size={16} className="text-green-400" />,
  'Vector': <FileJson size={16} className="text-blue-400" />,
  'Report': <FileText size={16} className="text-crafty-400" />,
  'Table': <Table size={16} className="text-amber-400" />,
};

export default function OutputFiles({ files }: OutputFilesProps) {
  return (
    <div className="flex flex-col h-1/2 min-h-0">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HardDrive size={16} className="text-crafty-400" />
          Output Files
          {files.length > 0 && (
            <span className="text-[10px] bg-surface-800 text-surface-400 px-1.5 py-0.5 rounded-full font-normal">
              {files.length}
            </span>
          )}
        </h3>
      </div>

      {/* Files */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center mb-3">
              <Download size={24} className="text-surface-600" />
            </div>
            <p className="text-sm text-surface-500">No outputs yet</p>
            <p className="text-xs text-surface-600 mt-1">
              Generated files will appear here after analysis
            </p>
          </div>
        ) : (
          files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/30 border border-surface-800/50 hover:bg-surface-800/50 transition-colors group cursor-pointer"
            >
              {fileIcons[file.type] || <FileText size={16} className="text-surface-400" />}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-200 truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-surface-500">{formatFileSize(file.size)}</span>
                  <span className="text-[10px] text-surface-600">|</span>
                  <span className="text-[10px] text-surface-500">{file.format}</span>
                </div>
              </div>

              <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-crafty-600/20 text-crafty-400 hover:bg-crafty-600/30 transition-all">
                <Download size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
