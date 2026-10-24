/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { AppSettings, ScreenOrientation } from '../types';
import {
  Settings,
  Shield,
  Smartphone,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Wifi,
  Camera,
  MapPin,
  Mic,
  Maximize2,
  Trash2,
  Lock,
  Sparkles,
  Fingerprint,
} from 'lucide-react';

interface AppSettingsFormProps {
  settings: AppSettings;
  onChangeSettings: (settings: AppSettings) => void;
  isPackageIdValid: boolean;
  isUpdateMode?: boolean;
  whatsNew?: string;
  onChangeWhatsNew?: (val: string) => void;
}

export const PACKAGE_ID_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export const AppSettingsForm: React.FC<AppSettingsFormProps> = ({
  settings,
  onChangeSettings,
  isPackageIdValid,
  isUpdateMode = false,
  whatsNew = '',
  onChangeWhatsNew,
}) => {
  const iconInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const updatePermission = (permKey: keyof AppSettings['permissions'], value: boolean) => {
    onChangeSettings({
      ...settings,
      permissions: {
        ...settings.permissions,
        [permKey]: value,
      },
    });
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('png') && !file.type.includes('image')) {
        alert('Please upload a PNG or image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        updateField('iconDataUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIcon = () => {
    updateField('iconDataUrl', null);
    if (iconInputRef.current) {
      iconInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* App Identity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Application Package & Identity
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* App Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              App Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => updateField('appName', e.target.value)}
              placeholder="e.g. My Space"
              className="w-full px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            {!settings.appName.trim() && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Required for Android strings.xml and launcher name
              </p>
            )}
          </div>

          {/* Package ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Package ID <span className="text-red-500">*</span>
              </label>
              {isUpdateMode && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <Lock className="w-3 h-3" />
                  <span>Locked for update</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                disabled={isUpdateMode}
                readOnly={isUpdateMode}
                value={settings.packageId}
                onChange={(e) => updateField('packageId', e.target.value.trim().toLowerCase())}
                placeholder="e.g. com.favour.myspace"
                className={`w-full px-3 py-2 text-xs font-mono rounded-md border text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 ${
                  isUpdateMode
                    ? 'bg-neutral-100 dark:bg-neutral-800/80 border-neutral-300 dark:border-neutral-700 cursor-not-allowed opacity-80'
                    : isPackageIdValid
                    ? 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-blue-500'
                    : 'border-red-300 dark:border-red-700 focus:ring-red-500 bg-red-50/20 dark:bg-red-950/20'
                }`}
              />
              {isUpdateMode && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            {settings.packageId && !isPackageIdValid ? (
              <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Must follow reverse-domain format (e.g. com.favour.myspace)
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {isUpdateMode
                  ? 'Package ID must remain constant for Android update compatibility'
                  : 'Lowercase letters, numbers, underscores, and dots (min 2 segments)'}
              </p>
            )}
          </div>

          {/* Version Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Version Name
            </label>
            <input
              type="text"
              value={settings.versionName}
              onChange={(e) => updateField('versionName', e.target.value)}
              placeholder="1.0.0"
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Version Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Version Code
              </label>
              {isUpdateMode && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                  (auto-incremented)
                </span>
              )}
            </div>
            <input
              type="number"
              min={1}
              step={1}
              value={settings.versionCode}
              onChange={(e) => updateField('versionCode', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* What's New Box (shown in Update Mode or whenever provided) */}
          {isUpdateMode && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>What's New in this Version</span>
                <span className="text-neutral-400 text-[11px] font-normal">(included in release notes)</span>
              </label>
              <textarea
                rows={2}
                value={whatsNew}
                onChange={(e) => onChangeWhatsNew?.(e.target.value)}
                placeholder="e.g. Added dark mode toggle, fixed navigation bugs, updated CSS styling"
                className="w-full px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-400 leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>

      {/* Visual & Screen Appearance */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Appearance & Orientation
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* App Icon */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              App Launcher Icon
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={iconInputRef}
                type="file"
                accept="image/png,image/*"
                onChange={handleIconUpload}
                className="hidden"
              />

              <div
                style={{ backgroundColor: settings.themeColor || '#2563EB' }}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm border border-black/10 overflow-hidden shrink-0"
              >
                {settings.iconDataUrl ? (
                  <img
                    src={settings.iconDataUrl}
                    alt="App Icon Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(settings.appName.trim() || 'A').charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{settings.iconDataUrl ? 'Change Icon' : 'Upload PNG'}</span>
                </button>

                {settings.iconDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset to Default</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Auto-resized to 48, 72, 96, 144, and 192px mipmaps
            </p>
          </div>

          {/* Theme Color */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Theme / Status Bar Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.themeColor}
                onChange={(e) => updateField('themeColor', e.target.value)}
                className="w-9 h-9 p-0.5 rounded cursor-pointer border border-neutral-300 dark:border-neutral-700 bg-transparent"
              />
              <input
                type="text"
                value={settings.themeColor}
                onChange={(e) => updateField('themeColor', e.target.value)}
                placeholder="#2563EB"
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Screen Orientation
            </label>
            <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-50 dark:bg-neutral-900">
              {(['auto', 'portrait', 'landscape'] as ScreenOrientation[]).map((orient) => (
                <button
                  key={orient}
                  type="button"
                  onClick={() => updateField('orientation', orient)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                    settings.orientation === orient
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  {orient}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-neutral-500" />
            <div>
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                Immersive Fullscreen
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Hides Android status bar and navigation bar (swipe to reveal)
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.fullscreen}
            onClick={() => updateField('fullscreen', !settings.fullscreen)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              settings.fullscreen ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                settings.fullscreen ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Permissions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Android Hardware & System Permissions
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Internet */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Internet</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Allows app to connect to external web APIs and assets
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.permissions.internet}
              onChange={(e) => updatePermission('internet', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Camera */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <div>
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Camera</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Webcam capture and photo upload support
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.permissions.camera}
              onChange={(e) => updatePermission('camera', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Location */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <div>
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Location</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  GPS geolocation (fine and coarse)
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.permissions.location}
              onChange={(e) => updatePermission('location', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* Microphone */}
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <div>
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Microphone</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Audio recording and Web Audio input
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.permissions.microphone}
              onChange={(e) => updatePermission('microphone', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Native Biometrics Bridge Callout */}
        <div className="mt-4 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs">
          <div className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
            <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Native Biometric Support Included (`AndroidBiometric`)</span>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed mb-2">
            The generated Android project embeds <code>androidx.biometric</code> with <code>USE_BIOMETRIC</code> permission. You can check availability and trigger system fingerprint / face unlock directly from your HTML:
          </p>
          <div className="bg-neutral-900 text-neutral-200 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed border border-neutral-800">
            {`if (window.AndroidBiometric && window.AndroidBiometric.isAvailable()) {\n  window.AndroidBiometric.authenticate("Unlock App", "Verify identity to continue");\n}\n\nwindow.onBiometricResult = function(success, errorMsg) {\n  if (success) { /* Access granted */ } else { alert(errorMsg); }\n};`}
          </div>
        </div>
      </div>
    </div>
  );
};
