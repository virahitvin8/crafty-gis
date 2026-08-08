"use client";

import {
  FileImage,
  FileText,
  FileSpreadsheet,
  FileJson,
  File,
  Download,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import type { OutputFile } from "@/app/page";

interface OutputFilesProps {
  files: OutputFile[];
  onRefresh: () => void;
}

const fileTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  png: { icon: <FileImage className="w-5 h-5" />, color: "text-emerald-400" },
  jpg: { icon: <FileImage className="w-5 h-5" />, color: "text-emerald-400" },
  tif: { icon: <FileImage className="w-5 h-5" />, color: "text-crafty-400" },
  geotiff: { icon: <FileImage className="w-5 h-5" />, color: "text-crafty-400" },
  pdf: { icon: <FileText className="w-5 h-5" />, color: "text-red-400" },
  docx: { icon: <FileText className="w-5 h-5" />, color: "text-blue-400" },
  html: { icon: <FileText className="w-5 h-5" />, color: "text-orange-400" },
  csv: { icon: <FileSpreadsheet className="w-5 h-5" />, color: "text-green-400" },
  xlsx: { icon: <FileSpreadsheet className="w-5 h-5" />, color: "text-green-400" },
  json: { icon: <FileJson className="w-5 h-5" />, color: "text-yellow-400" },
  gpkg: { icon: <File className="w-5 h-5" />, color: "text-purple-400" },
  shp: { icon: <File className="w-5 h-5" />, color: "text-purple-400" },
};

function getFileConfig(fileType: string) {
  const ext = fileType.toLowerCase().replace(/^\./, "");
  return fileTypeConfig[ext] || { icon: <File className="w-5 h-5" />, color: "text-zinc-400" };
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function OutputFiles({ files, onRefresh }: OutputFilesProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">No Outputs Yet</h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Analysis outputs will appear here once generated. You can download maps,
          reports, shapefiles, GeoTIFFs, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Output Files</h2>
          <p className="text-xs text-zinc-500">{files.length} file(s) generated</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 
                   transition-colors duration-150"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {files.map((file) => {
          const config = getFileConfig(file.file_type);
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

          return (
            <div
              key={file.id}
              className="group flex items-center gap-3 bg-zinc-800/20 border border-zinc-800/50 
                       rounded-xl p-3.5 hover:bg-zinc-800/30 transition-all duration-150"
            >
              {/* File icon */}
              <div className={`flex-shrink-0 ${config.color}`}>
                {config.icon}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-zinc-200 truncate">
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase text-zinc-500 font-mono">
                    .{file.file_type}
                  </span>
                  <span className="text-[10px] text-zinc-600">•</span>
                  <span className="text-[10px] text-zinc-500">{file.file_size_display}</span>
                  <span className="text-[10px] text-zinc-600">•</span>
                  <span className="text-[10px] text-zinc-500">{formatDate(file.created_at)}</span>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={() => {
                  if (file.is_downloadable) {
                    const link = document.createElement("a");
                    link.href = `${apiUrl}/api/data/download/${file.name}`;
                    link.download = file.name;
                    link.click();
                  }
                }}
                disabled={!file.is_downloadable}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-zinc-800 hover:bg-crafty-500/20 
                         border border-zinc-700 hover:border-crafty-500/30 
                         flex items-center justify-center text-zinc-400 hover:text-crafty-400
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-all duration-150"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bulk actions */}
      {files.length > 0 && (
        <div className="p-4 border-t border-zinc-800">
          <button
            className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 
                     text-zinc-300 py-2.5 rounded-lg font-medium transition-all duration-150"
          >
            Download All as ZIP
          </button>
        </div>
      )}
    </div>
  );
}
