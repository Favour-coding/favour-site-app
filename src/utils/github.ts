/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetFile, BuildRecord, GitHubUser } from '../types';
import { GeneratedProjectFile } from './androidTemplates';

const GITHUB_API_BASE = 'https://api.github.com';
export const DATA_REPO_NAME = 'apk-studio-data';

function getHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// UTF-8 safe Base64 encoding/decoding
export function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToString(b64: string): string {
  const cleanB64 = b64.replace(/\s+/g, '');
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function uint8ArrayToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const cleanB64 = b64.replace(/\s+/g, '');
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function handleGitHubResponse(response: Response, actionDesc: string) {
  if (response.ok) {
    if (response.status === 204) return null;
    return await response.json();
  }

  let errorDetails = '';
  try {
    const errorJson = await response.json();
    errorDetails = errorJson.message || JSON.stringify(errorJson);
  } catch {
    errorDetails = await response.text();
  }

  if (response.status === 401) {
    throw new Error(
      'Invalid GitHub personal access token. Please check that you entered the full token correctly.'
    );
  }
  if (response.status === 403) {
    if (response.headers.get('x-ratelimit-remaining') === '0') {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'shortly';
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}.`);
    }
    throw new Error(
      `Permission denied while ${actionDesc}. Ensure your personal access token has the 'repo' and 'workflow' scopes enabled.`
    );
  }
  if (response.status === 404) {
    throw new Error(`Not found (404) while ${actionDesc}: ${errorDetails}`);
  }
  if (response.status === 422) {
    throw new Error(`GitHub validation error while ${actionDesc}: ${errorDetails}`);
  }

  throw new Error(`GitHub API error (${response.status}) while ${actionDesc}: ${errorDetails}`);
}

/**
 * Verify personal access token and fetch user details
 */
export async function verifyGitHubToken(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: getHeaders(token),
  });
  const data = await handleGitHubResponse(res, 'verifying personal access token');
  return {
    login: data.login,
    id: data.id,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
    name: data.name,
    public_repos: data.public_repos,
  };
}

/**
 * Check if a repository exists
 */
export async function checkRepoExists(token: string, owner: string, repo: string): Promise<boolean> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: getHeaders(token),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Create a new public repository with auto_init: true
 */
export async function createRepository(
  token: string,
  repoName: string,
  appName: string
): Promise<{ name: string; html_url: string; owner: { login: string } }> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      description: `Android APK build repository for ${appName} - created by HTML to APK Studio`,
      private: false,
      auto_init: true,
    }),
  });
  return await handleGitHubResponse(res, 'creating new repository');
}

/**
 * Helper to fetch main branch ref and base commit tree with retry
 */
export async function getMainBranchRef(
  token: string,
  owner: string,
  repo: string
): Promise<{ commitSha: string; treeSha: string }> {
  let attempts = 0;
  while (attempts < 8) {
    attempts++;
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/main`, {
      headers: getHeaders(token),
    });
    if (res.ok) {
      const data = await res.json();
      const commitSha = data.object?.sha;
      if (commitSha) {
        const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${commitSha}`, {
          headers: getHeaders(token),
        });
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          const treeSha = commitData.tree?.sha;
          if (treeSha) {
            return { commitSha, treeSha };
          }
        }
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Failed to retrieve initial main branch ref from newly created repository.');
}

/**
 * Create a git blob
 */
export async function createGitBlob(
  token: string,
  owner: string,
  repo: string,
  content: string,
  encoding: 'utf-8' | 'base64'
): Promise<string> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      encoding,
    }),
  });
  const data = await handleGitHubResponse(res, 'creating git blob');
  return data.sha;
}

/**
 * Upload all files as Git Blobs and commit them on main branch based on initial commit
 */
export async function commitFilesToRepo(
  token: string,
  owner: string,
  repo: string,
  files: GeneratedProjectFile[],
  commitMessage: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ commitSha: string }> {
  // 1. Get main branch ref and base commit tree
  const { commitSha: baseCommitSha, treeSha: baseTreeSha } = await getMainBranchRef(token, owner, repo);

  // 2. Create blobs
  const treeItems: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
  let completed = 0;
  const concurrency = 4;
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (file) => {
        const sha = await createGitBlob(token, owner, repo, file.content, file.encoding);
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha,
        };
      })
    );
    treeItems.push(...results);
    completed += chunk.length;
    onProgress?.(completed, files.length);
  }

  // 3. Create tree based on base commit's tree
  const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  });
  const treeData = await handleGitHubResponse(treeRes, 'creating git tree');
  const newTreeSha = treeData.sha;

  // 4. Create new commit with base commit as parent
  const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      tree: newTreeSha,
      parents: [baseCommitSha],
    }),
  });
  const commitData = await handleGitHubResponse(commitRes, 'creating git commit');
  const newCommitSha = commitData.sha;

  // 5. Update refs/heads/main
  const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sha: newCommitSha,
      force: true,
    }),
  });
  await handleGitHubResponse(refRes, 'updating main branch ref');

  return { commitSha: newCommitSha };
}

export interface WorkflowRunSummary {
  id: number;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | string | null;
  html_url: string;
  run_number: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepSummary {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

/**
 * Fetch latest workflow run for the repo
 */
export async function getLatestWorkflowRun(
  token: string,
  owner: string,
  repo: string
): Promise<WorkflowRunSummary | null> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs`, {
    headers: getHeaders(token),
  });
  const data = await handleGitHubResponse(res, 'polling GitHub Action runs');
  if (data.workflow_runs && data.workflow_runs.length > 0) {
    return data.workflow_runs[0] as WorkflowRunSummary;
  }
  return null;
}

/**
 * Get job details including step statuses and failure lines if available
 */
export async function getWorkflowRunJobDetails(
  token: string,
  owner: string,
  repo: string,
  runId: number
): Promise<{ failedStepName?: string; steps: WorkflowStepSummary[]; currentStepName?: string }> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
      headers: getHeaders(token),
    });
    const data = await handleGitHubResponse(res, 'retrieving workflow jobs');
    if (data.jobs && data.jobs.length > 0) {
      const job = data.jobs[0];
      const steps: WorkflowStepSummary[] = job.steps || [];
      const failedStep = steps.find((s) => s.conclusion === 'failure');
      const inProgressStep = steps.find((s) => s.status === 'in_progress');
      return {
        failedStepName: failedStep?.name,
        currentStepName: inProgressStep?.name,
        steps,
      };
    }
  } catch (err) {
    console.warn('Could not inspect job steps', err);
  }
  return { steps: [] };
}

/**
 * Fetch the released APK download URL and release HTML link
 */
export async function getReleaseApkAsset(
  token: string,
  owner: string,
  repo: string,
  runNumber: number
): Promise<{ apkUrl: string; releaseUrl: string; releaseId?: number } | null> {
  const endpoints = [
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/tags/build-${runNumber}`,
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        const release = Array.isArray(data) ? data[0] : data;
        if (release && release.assets && release.assets.length > 0) {
          const apkAsset = release.assets.find((a: any) =>
            typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
          );
          if (apkAsset) {
            return {
              apkUrl: apkAsset.browser_download_url,
              releaseUrl: release.html_url,
              releaseId: release.id,
            };
          }
        }
      }
    } catch {
      // Continue to next endpoint attempt
    }
  }

  return null;
}

/**
 * Optional: Update release description with "What's new" note
 */
export async function updateReleaseBody(
  token: string,
  owner: string,
  repo: string,
  releaseId: number,
  body: string
): Promise<void> {
  try {
    await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/${releaseId}`, {
      method: 'PATCH',
      headers: {
        ...getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    });
  } catch (err) {
    console.warn('Could not update release body', err);
  }
}

/* =========================================================================
 * apk-studio-data Storage: Cross-Device Sync & App Backup
 * ========================================================================= */

/**
 * Ensure apk-studio-data private repository exists
 */
export async function ensureDataRepo(token: string, owner: string): Promise<void> {
  const exists = await checkRepoExists(token, owner, DATA_REPO_NAME);
  if (exists) return;

  // Create private repo with auto_init: true
  const res = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DATA_REPO_NAME,
      description: 'HTML to APK Studio private cloud sync storage (builds and app source backups)',
      private: true,
      auto_init: true,
    }),
  });

  if (res.status === 403 || res.status === 404) {
    throw new Error(
      "Your GitHub token lacks the 'repo' scope needed to create the private 'apk-studio-data' sync repository. Please ensure 'repo' is checked on your token."
    );
  }

  await handleGitHubResponse(res, 'creating private apk-studio-data repository');
}

/**
 * Fetch a file from apk-studio-data via Contents API
 */
export async function fetchDataFile(
  token: string,
  owner: string,
  path: string
): Promise<{ content: string; sha: string } | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${DATA_REPO_NAME}/contents/${path}`;
  const res = await fetch(url, {
    headers: getHeaders(token),
  });

  if (res.status === 404) {
    return null;
  }

  const data = await handleGitHubResponse(res, `reading ${path} from ${DATA_REPO_NAME}`);
  return {
    content: data.content ? base64ToString(data.content) : '',
    sha: data.sha,
  };
}

/**
 * Fetch raw binary / base64 content from apk-studio-data
 */
export async function fetchDataFileRawBase64(
  token: string,
  owner: string,
  path: string
): Promise<{ base64: string; sha: string } | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${DATA_REPO_NAME}/contents/${path}`;
  const res = await fetch(url, {
    headers: getHeaders(token),
  });

  if (res.status === 404) {
    return null;
  }

  const data = await handleGitHubResponse(res, `reading raw ${path} from ${DATA_REPO_NAME}`);
  return {
    base64: data.content ? data.content.replace(/\s+/g, '') : '',
    sha: data.sha,
  };
}

/**
 * Put a file into apk-studio-data via Contents API with 409/422 retry
 */
export async function putDataFile(
  token: string,
  owner: string,
  path: string,
  contentBase64: string,
  message: string
): Promise<{ sha: string }> {
  await ensureDataRepo(token, owner);

  const url = `${GITHUB_API_BASE}/repos/${owner}/${DATA_REPO_NAME}/contents/${path}`;

  // Fetch current sha if exists
  let currentSha: string | undefined = undefined;
  try {
    const existing = await fetchDataFileRawBase64(token, owner, path);
    if (existing) {
      currentSha = existing.sha;
    }
  } catch {
    // If not found, create new
  }

  const sendPut = async (sha?: string) => {
    const body: any = {
      message,
      content: contentBase64,
    };
    if (sha) body.sha = sha;

    return await fetch(url, {
      method: 'PUT',
      headers: {
        ...getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  let res = await sendPut(currentSha);

  // If 409 (conflict) or 422 (sha mismatch), re-fetch sha and retry once
  if (res.status === 409 || res.status === 422) {
    try {
      const fresh = await fetchDataFileRawBase64(token, owner, path);
      res = await sendPut(fresh?.sha);
    } catch {
      // Proceed to error handler
    }
  }

  const data = await handleGitHubResponse(res, `writing ${path} to ${DATA_REPO_NAME}`);
  return { sha: data.content?.sha || '' };
}

/**
 * Fetch builds.json from apk-studio-data
 */
export async function fetchBuildsJson(token: string, owner: string): Promise<BuildRecord[] | null> {
  try {
    const file = await fetchDataFile(token, owner, 'builds.json');
    if (!file || !file.content) return null;
    const parsed = JSON.parse(file.content);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn('Could not fetch builds.json from apk-studio-data', err);
    return null;
  }
}

/**
 * Save updated builds.json and app source files to apk-studio-data
 */
export async function saveBuildRecordAndSource(
  token: string,
  owner: string,
  newRecord: BuildRecord,
  htmlContent: string,
  iconDataUrl: string | null,
  assets: AssetFile[]
): Promise<BuildRecord[]> {
  // 1. Fetch current builds.json
  let existingBuilds: BuildRecord[] = [];
  try {
    const remoteBuilds = await fetchBuildsJson(token, owner);
    if (remoteBuilds) {
      existingBuilds = remoteBuilds;
    }
  } catch {
    // fresh list
  }

  // Prepend newest first, replace any existing item with same id
  const updatedList = [
    newRecord,
    ...existingBuilds.filter((b) => b.id !== newRecord.id),
  ];

  // 2. Write builds.json
  const buildsJsonContent = JSON.stringify(updatedList, null, 2);
  await putDataFile(
    token,
    owner,
    'builds.json',
    stringToBase64(buildsJsonContent),
    `Update builds.json with ${newRecord.appName} (v${newRecord.versionName})`
  );

  // 3. Save app source: apps/<package-id>/index.html
  const packageDir = `apps/${newRecord.packageId}`;
  await putDataFile(
    token,
    owner,
    `${packageDir}/index.html`,
    stringToBase64(htmlContent),
    `Backup HTML source for ${newRecord.packageId} (v${newRecord.versionName})`
  );

  // 4. Save icon if provided
  if (iconDataUrl) {
    const base64Data = iconDataUrl.includes(',')
      ? iconDataUrl.split(',')[1]
      : iconDataUrl;
    await putDataFile(
      token,
      owner,
      `${packageDir}/icon.png`,
      base64Data,
      `Backup icon for ${newRecord.packageId}`
    );
  }

  // 5. Save assets manifest and extra assets
  if (assets.length > 0) {
    const manifest = assets.map((a) => ({
      path: a.path,
      isBinary: a.isBinary,
      size: a.size,
    }));
    await putDataFile(
      token,
      owner,
      `${packageDir}/assets-manifest.json`,
      stringToBase64(JSON.stringify(manifest, null, 2)),
      `Assets manifest for ${newRecord.packageId}`
    );

    for (const asset of assets) {
      let b64Content = '';
      if (asset.isBinary && asset.content instanceof Uint8Array) {
        b64Content = uint8ArrayToBase64(asset.content);
      } else if (typeof asset.content === 'string') {
        b64Content = stringToBase64(asset.content);
      }
      if (b64Content) {
        await putDataFile(
          token,
          owner,
          `${packageDir}/assets/${asset.path}`,
          b64Content,
          `Asset: ${asset.path} for ${newRecord.packageId}`
        );
      }
    }
  }

  return updatedList;
}

/**
 * Load app source and assets from apk-studio-data
 */
export async function loadAppSourceFromDataRepo(
  token: string,
  owner: string,
  packageId: string
): Promise<{
  html: string;
  iconDataUrl: string | null;
  assets: AssetFile[];
}> {
  const packageDir = `apps/${packageId}`;

  // 1. Load HTML
  const htmlFile = await fetchDataFile(token, owner, `${packageDir}/index.html`);
  const html = htmlFile?.content || '';

  // 2. Load Icon
  let iconDataUrl: string | null = null;
  try {
    const iconFile = await fetchDataFileRawBase64(token, owner, `${packageDir}/icon.png`);
    if (iconFile && iconFile.base64) {
      iconDataUrl = `data:image/png;base64,${iconFile.base64}`;
    }
  } catch {
    // Optional icon
  }

  // 3. Load Assets Manifest
  const assets: AssetFile[] = [];
  try {
    const manifestFile = await fetchDataFile(token, owner, `${packageDir}/assets-manifest.json`);
    if (manifestFile && manifestFile.content) {
      const manifest: Array<{ path: string; isBinary: boolean; size: number }> = JSON.parse(
        manifestFile.content
      );

      for (const item of manifest) {
        try {
          const raw = await fetchDataFileRawBase64(
            token,
            owner,
            `${packageDir}/assets/${item.path}`
          );
          if (raw && raw.base64) {
            if (item.isBinary) {
              const uint8 = base64ToUint8Array(raw.base64);
              assets.push({
                path: item.path,
                content: uint8,
                isBinary: true,
                size: uint8.length,
              });
            } else {
              const str = base64ToString(raw.base64);
              assets.push({
                path: item.path,
                content: str,
                isBinary: false,
                size: str.length,
              });
            }
          }
        } catch {
          // skip missing asset
        }
      }
    }
  } catch {
    // no assets manifest
  }

  return { html, iconDataUrl, assets };
}

/**
 * Delete a build record from builds.json in apk-studio-data
 */
export async function deleteBuildRecordFromDataRepo(
  token: string,
  owner: string,
  buildId: string
): Promise<BuildRecord[]> {
  const existingBuilds = (await fetchBuildsJson(token, owner)) || [];
  const updated = existingBuilds.filter((b) => b.id !== buildId);

  await putDataFile(
    token,
    owner,
    'builds.json',
    stringToBase64(JSON.stringify(updated, null, 2)),
    `Remove build ${buildId} from builds.json`
  );

  return updated;
}
