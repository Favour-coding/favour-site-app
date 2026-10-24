/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScreenOrientation, AssetFile } from '../types';
import { RotateCw, Smartphone, Eye, Sparkles } from 'lucide-react';

interface PhonePreviewProps {
  htmlContent: string;
  assets: AssetFile[];
  themeColor: string;
  orientation: ScreenOrientation;
  fullscreen: boolean;
  appName: string;
}

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  htmlContent,
  assets,
  themeColor,
  orientation,
  fullscreen,
  appName,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeOrientation, setActiveOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Sync orientation with settings
  useEffect(() => {
    if (orientation === 'landscape') {
      setActiveOrientation('landscape');
    } else {
      setActiveOrientation('portrait');
    }
  }, [orientation]);

  // Construct preview document with assets resolution if uploaded via zip
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (!htmlContent.trim()) {
      return;
    }

    let processedHtml = htmlContent;

    // Inject base tag or inline replacement for relative assets if any were provided
    if (assets.length > 0) {
      assets.forEach((asset) => {
        if (!asset.isBinary && typeof asset.content === 'string') {
          // Replace inline link/script tags for exact paths if needed
          if (asset.path.endsWith('.css')) {
            const escaped = asset.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const linkRegex = new RegExp(`<link[^>]+href=["'](\\./)?${escaped}["'][^>]*>`, 'gi');
            if (linkRegex.test(processedHtml)) {
              processedHtml = processedHtml.replace(
                linkRegex,
                `<style>/* ${asset.path} */\n${asset.content}</style>`
              );
            }
          }
        }
      });
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(processedHtml);
      doc.close();
    }
  }, [htmlContent, assets, reloadKey]);

  const isLandscape = activeOrientation === 'landscape';

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Live Android Preview</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Toggle orientation preview"
          >
            <Smartphone className={`w-3.5 h-3.5 transition-transform ${isLandscape ? 'rotate-90' : ''}`} />
            <span className="capitalize">{activeOrientation}</span>
          </button>

          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={!htmlContent.trim()}
            className="p-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 transition-colors"
            title="Reload preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Device Bezel */}
      <div
        className={`relative transition-all duration-300 bg-neutral-900 rounded-[38px] p-3 shadow-2xl border-4 border-neutral-800 ring-1 ring-white/10 ${
          isLandscape ? 'w-[580px] h-[330px]' : 'w-[320px] h-[620px]'
        }`}
      >
        {/* Top Punch Hole / Speaker */}
        <div
          className={`absolute z-20 bg-neutral-950 flex items-center justify-center ${
            isLandscape
              ? 'left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full'
              : 'top-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ring-2 ring-neutral-900'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-neutral-800" />
        </div>

        {/* Status Bar simulation (if not fullscreen) */}
        {!fullscreen && (
          <div
            style={{ backgroundColor: themeColor || '#2563EB' }}
            className={`w-full text-[10px] text-white px-4 py-1 flex items-center justify-between font-mono font-medium rounded-t-[28px] shrink-0 select-none ${
              isLandscape ? 'h-6 pl-8' : 'h-7 pt-1.5'
            }`}
          >
            <span className="tracking-tight">9:41</span>
            <span className="truncate max-w-[120px] opacity-90 text-[11px] font-sans">
              {appName || 'App'}
            </span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Screen Viewport */}
        <div
          className={`w-full h-full overflow-hidden bg-white dark:bg-neutral-900 ${
            fullscreen ? 'rounded-[28px]' : 'rounded-b-[28px]'
          } flex flex-col`}
        >
          {htmlContent.trim() ? (
            <iframe
              key={reloadKey}
              ref={iframeRef}
              title="App Live Preview"
              sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
              className="w-full h-full border-none bg-white"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-400 dark:text-neutral-500">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Awaiting HTML
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[200px] leading-relaxed">
                Paste your code or upload an .html or .zip file on the left to test it live here.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Home Pill */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full pointer-events-none" />
      </div>
    </div>
  );
};
