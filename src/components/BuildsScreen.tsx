/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BuildRecord } from '../types';
import {
  History,
  Download,
  ExternalLink,
  Trash2,
  Calendar,
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  QrCode,
  RefreshCw,
  Cloud,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';

interface BuildsScreenProps {
  builds: BuildRecord[];
  onRemoveBuild: (id: string) => void;
  onClearAll: () => void;
  onGoToBuilder: () => void;
  onSelectAppForUpdate: (build: BuildRecord) => void;
  isSyncedWithCloud?: boolean;
}

export const BuildsScreen: React.FC<BuildsScreenProps> = ({
  builds,
  onRemoveBuild,
  onClearAll,
  onGoToBuilder,
  onSelectAppForUpdate,
  isSyncedWithCloud = false,
}) => {
  const [selectedQrBuild, setSelectedQrBuild] = useState<BuildRecord | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const handleShowQr = async (build: BuildRecord) => {
    if (!build.apkDownloadUrl) return;
    try {
      const url = await QRCode.toDataURL(build.apkDownloadUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(url);
      setSelectedQrBuild(build);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>My Builds & Cloud Sync</span>
            </h2>
            {isSyncedWithCloud && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                <Cloud className="w-3 h-3" />
                <span>apk-studio-data synced</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            Records of APK packages generated and published to your GitHub repositories, synced across all your devices.
          </p>
        </div>

        {builds.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-neutral-500 hover:text-red-600 dark:hover:text-red-400 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* APK Installation Guide Callout */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Android Debug APK Installation Guide</span>
        </div>
        <p>
          Generated APKs are debug-signed for personal testing and evaluation, not intended for Google Play Store upload.
          To install on your Android device:
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-neutral-700 dark:text-neutral-300">
          <li>Download the .apk directly on your phone or scan the QR code.</li>
          <li>If prompted by Android, go to <strong>Settings → Apps → Special app access → Install unknown apps</strong> and allow your browser or file manager.</li>
          <li>Tap the downloaded .apk file to install and launch your app.</li>
        </ol>
      </div>

      {/* Builds List */}
      {builds.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            No builds found
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Your compiled Android APKs and GitHub repository release assets will appear here and sync across your devices.
          </p>
          <button
            type="button"
            onClick={onGoToBuilder}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            Create Your First Build
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {builds.map((build) => {
            const dateStr = new Date(build.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={build.id}
                className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between gap-4 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {build.appName}
                      </span>
                      <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                        v{build.versionName} (build {build.versionCode || 1})
                      </span>
                      {build.status === 'success' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                      )}
                      {build.status === 'failure' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                      {build.status === 'building' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>In Progress</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-mono">{build.packageId}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px]">{build.repoName}</span>
                    </div>

                    {build.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 pt-1">
                        {build.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Update button */}
                    <button
                      type="button"
                      onClick={() => onSelectAppForUpdate(build)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Load this app into Builder to create an update"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>

                    {build.apkDownloadUrl && (
                      <>
                        <a
                          href={build.apkDownloadUrl}
                          download
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download APK</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleShowQr(build)}
                          className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                          title="Show Mobile QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <a
                      href={build.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Repo</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {build.runUrl && (
                      <a
                        href={build.runUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Logs</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveBuild(build.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Remove from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* What's New Note if Present */}
                {build.whatsNew && (
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        What's new in v{build.versionName}:{' '}
                      </span>
                      <span>{build.whatsNew}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {selectedQrBuild && qrCodeDataUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Scan to Download APK
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 font-mono">
              {selectedQrBuild.appName} v{selectedQrBuild.versionName}
            </p>

            <div className="bg-white p-3 rounded-xl shadow-inner inline-block mb-4 border border-neutral-200">
              <img
                src={qrCodeDataUrl}
                alt="APK Download QR Code"
                className="w-56 h-56 mx-auto"
              />
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
              Open your phone's camera app and point it at this QR code to download the debug APK straight to your device.
            </p>

            <button
              type="button"
              onClick={() => setSelectedQrBuild(null)}
              className="w-full py-2 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
