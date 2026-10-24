/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppSettings, AssetFile, BuildRecord, GitHubUser } from '../types';
import { HtmlEditor } from './HtmlEditor';
import { AppSettingsForm, PACKAGE_ID_REGEX } from './AppSettingsForm';
import { PhonePreview } from './PhonePreview';
import {
  Hammer,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  History,
  RotateCcw,
  RefreshCw,
  GitBranch,
  Cloud,
  CloudOff,
} from 'lucide-react';

interface BuilderScreenProps {
  htmlContent: string;
  onChangeHtml: (html: string) => void;
  assets: AssetFile[];
  onSetAssets: (assets: AssetFile[]) => void;
  onClear: () => void;
  settings: AppSettings;
  onChangeSettings: (settings: AppSettings) => void;
  onStartBuild: () => void;
  gitHubUser: GitHubUser | null;
  onGoToGitHub: () => void;
  isBuilding: boolean;
  lastBuild: BuildRecord | null;
  onUpdateApp: (build: BuildRecord) => void;
  onViewHistory: () => void;
  isUpdateMode: boolean;
  targetRepoName?: string;
  whatsNew: string;
  onChangeWhatsNew: (val: string) => void;
  onCancelUpdateMode: () => void;
  isCloudSyncing?: boolean;
  isCloudSynced?: boolean;
  cloudSyncNote?: string | null;
}

export const BuilderScreen: React.FC<BuilderScreenProps> = ({
  htmlContent,
  onChangeHtml,
  assets,
  onSetAssets,
  onClear,
  settings,
  onChangeSettings,
  onStartBuild,
  gitHubUser,
  onGoToGitHub,
  isBuilding,
  lastBuild,
  onUpdateApp,
  onViewHistory,
  isUpdateMode,
  targetRepoName,
  whatsNew,
  onChangeWhatsNew,
  onCancelUpdateMode,
  isCloudSyncing = false,
  isCloudSynced = false,
  cloudSyncNote,
}) => {
  const isHtmlNonEmpty = htmlContent.trim().length > 0;
  const isAppNameSet = settings.appName.trim().length > 0;
  const isPackageIdValid = PACKAGE_ID_REGEX.test(settings.packageId.trim());

  const canBuild = isHtmlNonEmpty && isAppNameSet && isPackageIdValid && !isBuilding;

  const validationItems = [
    {
      label: 'HTML content provided',
      valid: isHtmlNonEmpty,
      tip: 'Paste HTML or upload an .html or .zip file above',
    },
    {
      label: 'App name entered',
      valid: isAppNameSet,
      tip: 'Provide a display name for the application',
    },
    {
      label: 'Valid Android package ID',
      valid: isPackageIdValid,
      tip: 'e.g. com.favour.myspace (lowercase, dot separated)',
    },
  ];

  return (
    <div className="space-y-6 py-2">
      {/* Cloud Sync Status Note if offline or warning */}
      {cloudSyncNote && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{cloudSyncNote}</span>
          </div>
          <span className="text-[11px] font-mono opacity-80">Local offline cache active</span>
        </div>
      )}

      {/* TOP CARD: "Last app built: <name> (v<version>)" */}
      {lastBuild && !isUpdateMode && (
        <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-linear-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {lastBuild.appName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  Last app built:
                </span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {lastBuild.appName}
                </span>
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  (v{lastBuild.versionName || '1.0.0'})
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                {lastBuild.packageId} · {new Date(lastBuild.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onUpdateApp(lastBuild)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update this app</span>
            </button>

            {lastBuild.apkDownloadUrl && (
              <a
                href={lastBuild.apkDownloadUrl}
                download
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View APK</span>
              </a>
            )}

            <button
              type="button"
              onClick={onViewHistory}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>
        </div>
      )}

      {/* UPDATE MODE BANNER */}
      {isUpdateMode && (
        <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Update Mode Active: <span className="underline">{settings.appName}</span>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-mono mt-0.5 flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>Target repository: {targetRepoName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelUpdateMode}
            className="px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Update Mode</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editor & App Configurations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Editor Box */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <HtmlEditor
              htmlContent={htmlContent}
              onChangeHtml={onChangeHtml}
              assets={assets}
              onSetAssets={onSetAssets}
              onClear={onClear}
            />
          </div>

          {/* App Settings & Permissions */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <AppSettingsForm
              settings={settings}
              onChangeSettings={onChangeSettings}
              isPackageIdValid={isPackageIdValid}
              isUpdateMode={isUpdateMode}
              whatsNew={whatsNew}
              onChangeWhatsNew={onChangeWhatsNew}
            />
          </div>

          {/* Build Action & Validation Bar */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>{isUpdateMode ? 'Ready to Deploy Update' : 'Ready to Compile'}</span>
                  {isUpdateMode && (
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      build #{settings.versionCode}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {isUpdateMode
                    ? `Pushes update commit to ${targetRepoName} and triggers workflow.`
                    : 'Builds a single-activity WebView Android app with Android 14 / SDK 34 support.'}
                </p>
              </div>

              <button
                type="button"
                onClick={onStartBuild}
                disabled={!canBuild}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                  canBuild
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/30'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-70'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>{isUpdateMode ? 'Build update' : 'Build Android APK'}</span>
              </button>
            </div>

            {/* Validation Checklist */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {validationItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 ${
                    item.valid
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {item.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* GitHub Connection Notice */}
            {!gitHubUser && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>GitHub Personal Access Token required to run the automated build.</span>
                </div>
                <button
                  type="button"
                  onClick={onGoToGitHub}
                  className="font-semibold underline hover:text-amber-950 dark:hover:text-amber-100 whitespace-nowrap cursor-pointer"
                >
                  Connect GitHub →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Phone Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-20 w-full flex justify-center p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <PhonePreview
              htmlContent={htmlContent}
              assets={assets}
              themeColor={settings.themeColor}
              orientation={settings.orientation}
              fullscreen={settings.fullscreen}
              appName={settings.appName}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
