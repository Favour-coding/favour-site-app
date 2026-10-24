/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppPermissions {
  internet: boolean;
  camera: boolean;
  location: boolean;
  microphone: boolean;
}

export type ScreenOrientation = 'auto' | 'portrait' | 'landscape';

export interface AppSettings {
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  themeColor: string;
  orientation: ScreenOrientation;
  fullscreen: boolean;
  permissions: AppPermissions;
  iconDataUrl: string | null; // Base64 data URL
}

export interface AssetFile {
  path: string; // Relative path inside assets, e.g. "style.css" or "images/bg.png"
  content: string | Uint8Array;
  isBinary: boolean;
  size: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  public_repos: number;
}

export interface BuildRecord {
  id: string;
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  themeColor: string;
  orientation: ScreenOrientation;
  fullscreen: boolean;
  permissions: AppPermissions;
  repoName: string;
  repoUrl: string;
  apkDownloadUrl?: string;
  releaseUrl?: string;
  runId?: number;
  runUrl?: string;
  createdAt: string;
  status: 'building' | 'success' | 'failure';
  errorMessage?: string;
  whatsNew?: string;
  iconDataUrl?: string | null;
}

export interface UpdateModeState {
  isUpdate: boolean;
  targetRepoName: string;
  targetRepoUrl: string;
  previousVersionCode: number;
  previousVersionName: string;
  whatsNew: string;
}

export type ActiveScreen = 'builder' | 'github' | 'builds';

export type BuildStage =
  | 'idle'
  | 'validating'
  | 'checking_repo'
  | 'creating_repo'
  | 'generating_project'
  | 'uploading_files'
  | 'building'
  | 'publishing'
  | 'saving_data'
  | 'done'
  | 'failed';

export interface BuildProgress {
  stage: BuildStage;
  message: string;
  elapsedSeconds: number;
  repoName?: string;
  repoUrl?: string;
  runId?: number;
  runUrl?: string;
  apkUrl?: string;
  releaseUrl?: string;
  error?: string;
  failedStepName?: string;
}
