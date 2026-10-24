/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { AssetFile } from '../types';
import { processUploadedFile } from '../utils/zipHandler';
import { Upload, Trash2, FileCode, Archive, AlertCircle, FileCheck } from 'lucide-react';

interface HtmlEditorProps {
  htmlContent: string;
  onChangeHtml: (html: string) => void;
  assets: AssetFile[];
  onSetAssets: (assets: AssetFile[]) => void;
  onClear: () => void;
}

export const HtmlEditor: React.FC<HtmlEditorProps> = ({
  htmlContent,
  onChangeHtml,
  assets,
  onSetAssets,
  onClear,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);
    try {
      const result = await processUploadedFile(file);
      onChangeHtml(result.html);
      onSetAssets(result.assets);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process uploaded file.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const lineCount = htmlContent ? htmlContent.split('\n').length : 0;
  const byteCount = new Blob([htmlContent]).size;
  const formattedSize =
    byteCount > 1024 * 1024
      ? `${(byteCount / (1024 * 1024)).toFixed(1)} MB`
      : byteCount > 1024
      ? `${(byteCount / 1024).toFixed(1)} KB`
      : `${byteCount} B`;

  return (
    <div className="flex flex-col gap-3">
      {/* Action Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <label htmlFor="html-textarea" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            HTML Source
          </label>
          {htmlContent.trim() && (
            <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
              {lineCount} lines · {formattedSize}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.zip"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload-input"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Extracting...' : 'Upload .html or .zip'}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={!htmlContent && assets.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="Clear all editor contents and assets"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Editor & Drop Target */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg border transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40'
        }`}
      >
        <textarea
          id="html-textarea"
          value={htmlContent}
          onChange={(e) => onChangeHtml(e.target.value)}
          placeholder={`<!-- Paste your raw HTML here or drag & drop an .html or .zip file -->\n<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Web App</title>\n  </head>\n  <body>\n    <!-- Your UI goes here -->\n  </body>\n</html>`}
          rows={14}
          spellCheck={false}
          className="w-full p-4 font-mono text-xs text-neutral-800 dark:text-neutral-200 bg-transparent resize-y focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg leading-relaxed placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
        />

        {isDragging && (
          <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-xs flex items-center justify-center rounded-lg pointer-events-none border-2 border-dashed border-blue-500">
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 px-4 py-2 rounded-lg shadow-md text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Upload className="w-4 h-4 animate-bounce" />
              <span>Drop .html or .zip file to load</span>
            </div>
          </div>
        )}
      </div>

      {/* Extra Zip Assets Drawer */}
      {assets.length > 0 && (
        <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              <Archive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Loaded Package Assets ({assets.length})</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              Will be placed in app/src/main/assets/
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {assets.map((asset, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
              >
                <FileCheck className="w-3 h-3 text-emerald-500" />
                <span className="truncate max-w-[200px]">{asset.path}</span>
                <span className="text-[10px] text-neutral-400">
                  ({asset.size > 1024 ? `${Math.round(asset.size / 1024)}KB` : `${asset.size}B`})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
