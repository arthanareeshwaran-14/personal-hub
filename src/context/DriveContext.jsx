import { createContext, useContext, useCallback, useState, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";

const DriveContext = createContext(null);
const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const SUBFOLDERS = ["Pictures", "Videos", "Documents", "Audio", "Others", "update_data"];
const ROOT_FOLDER_KEY = "personalsite_root_folder";

/**
 * Uploads a file or blob to Google Drive using RFC 2387 multipart/related format.
 * This is required by Google Drive API v3 to upload metadata + binary file content in a single request.
 */
async function uploadToDriveMultipart(fileOrBlob, metadata, accessToken, customFilename = null) {
  const boundary = "-------PersonalSite" + Math.random().toString(36).substring(2);
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const contentType = fileOrBlob.type || "application/octet-stream";
  const metadataContentType = "application/json; charset=UTF-8";

  const fileData = await fileOrBlob.arrayBuffer();

  const finalMetadata = {
    ...metadata,
    name: customFilename || metadata.name || fileOrBlob.name || "file",
  };

  const header =
    delimiter +
    `Content-Type: ${metadataContentType}\r\n\r\n` +
    JSON.stringify(finalMetadata) +
    delimiter +
    `Content-Type: ${contentType}\r\n\r\n`;

  const headerBlob = new Blob([header], { type: "text/plain" });
  const footerBlob = new Blob([closeDelimiter], { type: "text/plain" });

  const multipartBody = new Blob([headerBlob, fileData, footerBlob], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const res = await fetch(
    `${UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive upload error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

export function DriveProvider({ children }) {
  const { accessToken, handleTokenExpired } = useAuth();
  const [rootFolderName, setRootFolderName] = useState("PersonalSite_Data");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [rootFolderId, setRootFolderId] = useState(null);

  // Restore saved root folder name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(ROOT_FOLDER_KEY);
    if (saved) setRootFolderName(saved);
  }, []);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }), [accessToken]);

  // ── Find or create a folder in Google Drive ──────────────────────────────────
  const ensureFolder = useCallback(async (name, parentId = null) => {
    if (!accessToken) return null;
    try {
      let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        q += ` and '${parentId}' in parents`;
      } else {
        q += ` and 'root' in parents`;
      }

      const res = await fetch(
        `${API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)`,
        { headers: authHeaders() }
      );

      if (res.status === 401) {
        handleTokenExpired();
        throw new Error("Google Session Expired");
      }

      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }

      // Folder does not exist: create it in parentId or root
      const meta = {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : ["root"],
      };

      const createRes = await fetch(`${API_BASE}/files?fields=id,name,webViewLink`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(meta),
      });

      if (createRes.status === 401) {
        handleTokenExpired();
        throw new Error("Google Session Expired");
      }

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create folder ${name}: ${errText}`);
      }

      const folder = await createRes.json();
      console.log(`[Drive] Created folder "${name}" with ID:`, folder.id);
      return folder.id;
    } catch (e) {
      console.error(`ensureFolder error (${name}):`, e);
      return null;
    }
  }, [accessToken, authHeaders, handleTokenExpired]);

  // ── Get (and cache) the Root Folder ID ───────────────────────────────────────
  const getRootFolderId = useCallback(async () => {
    if (rootFolderId) return rootFolderId;
    const id = await ensureFolder(rootFolderName, null);
    if (id) setRootFolderId(id);
    return id;
  }, [rootFolderId, rootFolderName, ensureFolder]);

  // ── Initialize Full Folder Structure in Drive ────────────────────────────────
  const initializeFolders = useCallback(async () => {
    if (!accessToken) {
      setIsReady(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const rootId = await getRootFolderId();
      if (rootId) {
        await Promise.all(SUBFOLDERS.map(sf => ensureFolder(sf, rootId)));
        setIsReady(true);
      } else {
        throw new Error("Could not access or create root folder in Google Drive.");
      }
    } catch (e) {
      console.error("initializeFolders error:", e);
      setError(e.message || "Could not initialize Google Drive folders.");
      setIsReady(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, getRootFolderId, ensureFolder]);

  useEffect(() => {
    if (accessToken) {
      initializeFolders();
    }
  }, [accessToken, initializeFolders]);

  // ── Fetch & List Files from Drive (scans all subfolders) ─────────────────────
  const refreshFiles = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const rootId = await getRootFolderId();
      if (!rootId) throw new Error("Root folder not found in Google Drive.");

      // 1. Get all subfolders
      const subFolderRes = await fetch(
        `${API_BASE}/files?q=${encodeURIComponent(
          `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        )}&fields=files(id,name)&pageSize=50`,
        { headers: authHeaders() }
      );

      if (subFolderRes.status === 401) {
        handleTokenExpired();
        return;
      }

      let subFolderMap = {};
      let parentIds = [rootId];

      if (subFolderRes.ok) {
        const subData = await subFolderRes.json();
        if (subData.files) {
          subData.files.forEach(f => {
            subFolderMap[f.id] = f.name.toLowerCase();
            parentIds.push(f.id);
          });
        }
      }

      // 2. Query all non-folder files inside root and all subfolders
      const parentQuery = parentIds.map(id => `'${id}' in parents`).join(" or ");
      const filesQuery = `(${parentQuery}) and mimeType!='application/vnd.google-apps.folder' and trashed=false`;

      const filesRes = await fetch(
        `${API_BASE}/files?q=${encodeURIComponent(filesQuery)}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,parents)&pageSize=250`,
        { headers: authHeaders() }
      );

      if (filesRes.status === 401) {
        handleTokenExpired();
        return;
      }

      if (!filesRes.ok) throw new Error(`Files fetch failed: ${filesRes.status}`);
      const filesData = await filesRes.json();

      const categorize = (file) => {
        if (file.parents) {
          for (const pid of file.parents) {
            const folderName = subFolderMap[pid];
            if (folderName) {
              if (folderName === "pictures") return "pictures";
              if (folderName === "videos") return "videos";
              if (folderName === "audio") return "audio";
              if (folderName === "documents") return "documents";
              if (folderName === "others") return "others";
            }
          }
        }
        const name = (file.name || "").toLowerCase();
        if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(name)) return "pictures";
        if (/\.(mp4|mov|avi|webm|mkv)$/.test(name)) return "videos";
        if (/\.(mp3|wav|ogg|aac|m4a|flac)$/.test(name)) return "audio";
        if (/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|csv|md)$/.test(name)) return "documents";
        return "others";
      };

      const mapped = (filesData.files || [])
        // Exclude system JSON configuration files from the media vault view
        .filter(f => !f.name.endsWith(".json"))
        .map(f => ({
          id: f.id,
          name: f.name,
          size: parseInt(f.size || "0", 10),
          mimeType: f.mimeType,
          webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          webContentLink: f.webContentLink || `https://drive.google.com/uc?export=download&id=${f.id}`,
          thumbnailLink: f.thumbnailLink || `https://lh3.googleusercontent.com/d/${f.id}`,
          category: categorize(f),
        }));

      setFiles(mapped);
    } catch (err) {
      console.error("refreshFiles error:", err);
      setError("Could not load files from Google Drive.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, getRootFolderId, authHeaders, handleTokenExpired]);

  useEffect(() => {
    if (isReady && accessToken) {
      refreshFiles();
    }
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rename Root Folder ───────────────────────────────────────────────────────
  const renameRootFolder = useCallback(async (newName) => {
    if (!newName || newName === rootFolderName || !accessToken) return false;
    try {
      const id = await getRootFolderId();
      if (id) {
        await fetch(`${API_BASE}/files/${id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ name: newName }),
        });
        setRootFolderId(null);
      }
      setRootFolderName(newName);
      localStorage.setItem(ROOT_FOLDER_KEY, newName);
      return true;
    } catch (e) {
      console.error("renameRootFolder error:", e);
      return false;
    }
  }, [accessToken, rootFolderName, getRootFolderId, authHeaders]);

  // ── Read a JSON data file from Drive (with localStorage fallback cache) ──────
  const readFile = useCallback(async (filename) => {
    const localData = localStorage.getItem("personalsite_file_" + filename);
    const local = localData ? JSON.parse(localData) : null;

    if (!accessToken) return local;

    try {
      const rootId = await getRootFolderId();
      if (!rootId) return local;

      const res = await fetch(
        `${API_BASE}/files?q=${encodeURIComponent(
          `name='${filename}' and '${rootId}' in parents and trashed=false`
        )}&fields=files(id)`,
        { headers: authHeaders() }
      );
      if (!res.ok) return local;

      const data = await res.json();
      if (!data.files || data.files.length === 0) return local;

      const contentRes = await fetch(
        `${API_BASE}/files/${data.files[0].id}?alt=media`,
        { headers: authHeaders() }
      );
      if (!contentRes.ok) return local;

      const content = await contentRes.json();
      localStorage.setItem("personalsite_file_" + filename, JSON.stringify(content));
      return content;
    } catch (e) {
      console.error("readFile error:", e);
      return local;
    }
  }, [accessToken, getRootFolderId, authHeaders]);

  // ── Write a JSON data file to Drive ──────────────────────────────────────────
  const writeFile = useCallback(async (filename, content) => {
    const jsonStr = JSON.stringify(content, null, 2);
    localStorage.setItem("personalsite_file_" + filename, jsonStr);

    if (!accessToken) return;

    try {
      const rootId = await getRootFolderId();
      if (!rootId) return;

      const res = await fetch(
        `${API_BASE}/files?q=${encodeURIComponent(
          `name='${filename}' and '${rootId}' in parents and trashed=false`
        )}&fields=files(id)`,
        { headers: authHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          // Update existing file content
          await fetch(`${UPLOAD_BASE}/files/${data.files[0].id}?uploadType=media`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: jsonStr,
          });
        } else {
          // Create new file with multipart/related
          const blob = new Blob([jsonStr], { type: "application/json" });
          await uploadToDriveMultipart(blob, { name: filename, parents: [rootId] }, accessToken, filename);
        }
      }
    } catch (e) {
      console.error("writeFile error:", e);
    }
  }, [accessToken, getRootFolderId, authHeaders]);

  // ── Upload Profile Media (Avatar, Banner, Music) to update_data/ folder ─────
  // Deletes previous file of the same type and sets public read permission
  const uploadProfileMedia = useCallback(async (file, type) => {
    const prefix = type + "_";

    if (!accessToken) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          localStorage.setItem(`personalsite_media_${type}`, e.target.result);
          resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    try {
      const rootId = await getRootFolderId();
      const updateFolderId = await ensureFolder("update_data", rootId);
      if (!updateFolderId) throw new Error("Could not access update_data folder in Google Drive.");

      // 1. Delete previous file of same type in update_data
      const searchRes = await fetch(
        `${API_BASE}/files?q=${encodeURIComponent(
          `'${updateFolderId}' in parents and name contains '${prefix}' and trashed=false`
        )}&fields=files(id,name)`,
        { headers: authHeaders() }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          await Promise.all(
            searchData.files.map(f =>
              fetch(`${API_BASE}/files/${f.id}`, { method: "DELETE", headers: authHeaders() })
            )
          );
        }
      }

      // 2. Upload new file using multipart/related
      const ext = file.name.split(".").pop();
      const newName = `${prefix}${Date.now()}.${ext}`;
      const uploaded = await uploadToDriveMultipart(
        file,
        { name: newName, parents: [updateFolderId] },
        accessToken,
        newName
      );

      // 3. Make file readable so it can be previewed/embedded
      try {
        await fetch(`${API_BASE}/files/${uploaded.id}/permissions`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ role: "reader", type: "anyone" }),
        });
      } catch (permErr) {
        console.warn("Could not set public permission:", permErr);
      }

      // Direct embeddable CDN URL
      const mediaUrl = `https://lh3.googleusercontent.com/d/${uploaded.id}`;
      localStorage.setItem(`personalsite_media_${type}`, mediaUrl);
      return mediaUrl;
    } catch (e) {
      console.error("uploadProfileMedia error:", e);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          localStorage.setItem(`personalsite_media_${type}`, ev.target.result);
          resolve(ev.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }, [accessToken, getRootFolderId, ensureFolder, authHeaders]);

  // ── Upload a Binary File to Vault (Pictures, Videos, Documents, Audio, Others)
  const uploadFile = useCallback(async (file, targetSubfolder = "documents") => {
    if (!accessToken) throw new Error("Please sign in with Google to upload files to Drive.");

    try {
      const rootId = await getRootFolderId();
      if (!rootId) throw new Error("Could not find PersonalSite_Data root folder in Google Drive.");

      const targetFolderName =
        SUBFOLDERS.find(s => s.toLowerCase() === targetSubfolder.toLowerCase()) || targetSubfolder;

      const subId = await ensureFolder(targetFolderName, rootId);
      const parentId = subId || rootId;

      const uploaded = await uploadToDriveMultipart(
        file,
        { name: file.name, parents: [parentId] },
        accessToken,
        file.name
      );

      const newEntry = {
        id: uploaded.id,
        name: file.name,
        size: parseInt(uploaded.size || file.size || "0", 10),
        mimeType: file.type || "application/octet-stream",
        category: targetSubfolder.toLowerCase(),
        webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
        webContentLink: uploaded.webContentLink || `https://drive.google.com/uc?export=download&id=${uploaded.id}`,
        thumbnailLink: uploaded.thumbnailLink || `https://lh3.googleusercontent.com/d/${uploaded.id}`,
      };

      setFiles(prev => [newEntry, ...prev.filter(f => f.id !== uploaded.id)]);
      return newEntry;
    } catch (e) {
      console.error("uploadFile error:", e);
      throw e;
    }
  }, [accessToken, getRootFolderId, ensureFolder]);

  // ── Delete a File from Google Drive ───────────────────────────────────────────
  const deleteFile = useCallback(async (fileId) => {
    try {
      if (accessToken) {
        await fetch(`${API_BASE}/files/${fileId}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      }
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (e) {
      console.error("deleteFile error:", e);
    }
  }, [accessToken, authHeaders]);

  const value = useMemo(() => ({
    rootFolderName,
    rootFolderId,
    renameRootFolder,
    readFile,
    writeFile,
    uploadFile,
    uploadProfileMedia,
    deleteFile,
    initializeFolders,
    files,
    loading,
    error,
    isReady,
    refreshFiles,
  }), [
    rootFolderName,
    rootFolderId,
    renameRootFolder,
    readFile,
    writeFile,
    uploadFile,
    uploadProfileMedia,
    deleteFile,
    initializeFolders,
    files,
    loading,
    error,
    isReady,
    refreshFiles,
  ]);

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
}

export const useDrive = () => useContext(DriveContext);
