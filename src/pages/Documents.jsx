import { useState, useRef, useMemo } from "react";
import { useDrive } from "../context/DriveContext";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import {
  Upload, FileText, Image as ImageIcon, Film, Music, File,
  ExternalLink, Download, RefreshCw, Folder, CheckCircle2,
  Trash2, LayoutGrid, List, HardDrive, Search, Filter,
  ArrowUpDown, Cloud, Eye, X, Check, FileCheck, Sparkles,
  AlertCircle, ShieldCheck, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Categories Definition ──────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",       label: "All Assets", icon: Folder,    color: "var(--primary)" },
  { id: "pictures",  label: "Pictures",   icon: ImageIcon, color: "#8b5cf6" },
  { id: "documents", label: "Documents",  icon: FileText,  color: "#3b82f6" },
  { id: "videos",    label: "Videos",     icon: Film,      color: "#ef4444" },
  { id: "audio",     label: "Audio",      icon: Music,     color: "#f59e0b" },
  { id: "others",    label: "Others",     icon: File,      color: "#64748b" },
];

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const detectCategory = (filename) => {
  if (!filename) return "documents";
  const ext = filename.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext)) return "pictures";
  if (["mp4", "webm", "mkv", "mov", "avi"].includes(ext)) return "videos";
  if (["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext)) return "audio";
  if (["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "csv", "md"].includes(ext)) return "documents";
  return "others";
};

const getFileIcon = (cat) => {
  switch (cat) {
    case "pictures":  return { icon: ImageIcon, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" };
    case "videos":    return { icon: Film,      color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
    case "audio":     return { icon: Music,     color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
    case "documents": return { icon: FileText,  color: "#0284c7", bg: "rgba(14, 165, 233, 0.1)" };
    default:          return { icon: File,      color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" };
  }
};

export default function DriveVault() {
  const { files = [], loading = false, error: driveError, rootFolderId, uploadFile, deleteFile, refreshFiles } = useDrive();
  const { isGuest, signIn } = useAuth();

  // Filters & Views
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "name" | "size"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Upload Management
  const [uploadCategory, setUploadCategory] = useState("auto");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const fileInputRef = useRef(null);

  const safeFiles = useMemo(() => (Array.isArray(files) ? files : []), [files]);

  // Storage metrics calculations
  const totalSizeBytes = useMemo(() => {
    return safeFiles.reduce((acc, curr) => acc + (Number(curr.size) || 0), 0);
  }, [safeFiles]);

  const categoryCounts = useMemo(() => {
    const counts = { all: safeFiles.length, pictures: 0, documents: 0, videos: 0, audio: 0, others: 0 };
    safeFiles.forEach(f => {
      const cat = f.category || "others";
      if (counts[cat] !== undefined) counts[cat]++;
      else counts.others++;
    });
    return counts;
  }, [safeFiles]);

  // Filtered & Sorted files list
  const processedFiles = useMemo(() => {
    return safeFiles
      .filter((file) => {
        const matchesCategory = activeCategory === "all" || file.category === activeCategory;
        const matchesSearch = !searchQuery.trim() || file.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "size") return (b.size || 0) - (a.size || 0);
        // Default: newest first
        return (b.id || "").localeCompare(a.id || "");
      });
  }, [safeFiles, activeCategory, searchQuery, sortBy]);

  // Handlers
  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    if (uploadCategory === "auto") {
      setUploadCategory(detectCategory(file.name));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(20);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 85 ? prev + 15 : prev));
      }, 150);

      const targetFolder = uploadCategory === "auto" ? detectCategory(selectedFile.name) : uploadCategory;
      const uploadedResult = await uploadFile(selectedFile, targetFolder);

      clearInterval(interval);

      if (uploadedResult && uploadedResult.id) {
        setUploadProgress(100);
        setUploadSuccess(true);
        setSelectedFile(null);
        setUploadCategory("auto");
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        await refreshFiles();

        setTimeout(() => {
          setUploadSuccess(false);
          setUploadProgress(0);
        }, 4000);
      } else {
        throw new Error("Upload did not complete successfully with Google Drive.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload file to Google Drive. Please verify your connection.");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!deleteFile) return;
    try {
      await deleteFile(id);
      setDeleteConfirmId(null);
      if (previewFile?.id === id) setPreviewFile(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <main className="main-content">
        <div style={{ maxWidth: 1240, margin: "0 auto", width: "100%" }}>

          {/* ── Top Header Bar ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 30,
              flexWrap: "wrap",
              gap: 20
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 20px rgba(14, 165, 233, 0.25)"
                  }}
                >
                  <HardDrive size={22} color="white" />
                </div>
                <div>
                  <h1 style={{ fontSize: "2.15rem", fontWeight: 900, letterSpacing: "-0.6px", margin: 0 }}>
                    Drive Vault
                  </h1>
                </div>
                {isGuest ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      color: "#d97706",
                      fontSize: "0.78rem",
                      fontWeight: 700
                    }}
                  >
                    <Lock size={14} /> Guest Mode (Drive Locked)
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      color: "#059669",
                      fontSize: "0.78rem",
                      fontWeight: 700
                    }}
                  >
                    <ShieldCheck size={14} /> Google Drive Cloud Synced
                  </div>
                )}
              </div>
              <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: "0.93rem" }}>
                Secure, organized personal asset management backed directly by your Google Drive storage.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {rootFolderId ? (
                <a
                  href={`https://drive.google.com/drive/folders/${rootFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "var(--glass-bg)",
                    backdropFilter: "var(--glass-blur)",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Open in Drive</span>
                </a>
              ) : null}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={refreshFiles}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1.5px solid var(--border)",
                  background: "var(--glass-bg)",
                  backdropFilter: "var(--glass-blur)",
                  color: "var(--primary-dark)",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  transition: "all 0.2s ease"
                }}
              >
                <RefreshCw size={15} className={loading ? "spinner" : ""} />
                <span>{loading ? "Syncing..." : "Sync Vault"}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* ── Storage Overview Metrics ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 30
            }}
          >
            {/* Total Storage Card */}
            <div
              className="glass"
              style={{
                padding: "18px 20px",
                borderRadius: 18,
                border: "1.5px solid var(--border)",
                background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, var(--bg-secondary) 100%)",
                display: "flex",
                alignItems: "center",
                gap: 14
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flexShrink: 0
                }}
              >
                <Cloud size={22} />
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Stored
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.2, marginTop: 2 }}>
                  {formatSize(totalSizeBytes)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--primary-dark)", fontWeight: 600, marginTop: 2 }}>
                  {safeFiles.length} file{safeFiles.length !== 1 ? "s" : ""} active
                </div>
              </div>
            </div>

            {/* Category breakdown stat pills */}
            {[
              { label: "Pictures", count: categoryCounts.pictures, icon: ImageIcon, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
              { label: "Documents", count: categoryCounts.documents, icon: FileText, color: "#0284c7", bg: "rgba(14,165,233,0.1)" },
              { label: "Videos", count: categoryCounts.videos, icon: Film, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
              { label: "Audio", count: categoryCounts.audio, icon: Music, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
              { label: "Others", count: categoryCounts.others, icon: File, color: "#64748b", bg: "rgba(100,116,139,0.1)" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass hover-target"
                onClick={() => setActiveCategory(stat.label.toLowerCase())}
                style={{
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: activeCategory === stat.label.toLowerCase() ? `1.5px solid ${stat.color}` : "1.5px solid var(--border)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.25s ease",
                  background: activeCategory === stat.label.toLowerCase() ? stat.bg : "var(--glass-bg)"
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: stat.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                    flexShrink: 0
                  }}
                >
                  <stat.icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1 }}>
                    {stat.count}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Integrated Upload Dropzone & Action Bar ──────────────────── */}
          {isGuest ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass"
              style={{
                padding: "32px 28px",
                borderRadius: 20,
                border: "1.5px solid var(--border)",
                marginBottom: 32,
                background: "var(--glass-bg)",
                backdropFilter: "var(--glass-blur)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Lock size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 6px 0", color: "var(--text-primary)" }}>
                  Google Drive Uploading is Locked in Guest Mode
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.5 }}>
                  Only logged-in Google accounts can upload and sync files with Google Drive cloud storage. Sign in with Google anytime to unlock cloud syncing.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={signIn}
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px var(--border)"
                }}
              >
                <Upload size={16} /> Sign in with Google to Unlock Drive Uploads
              </motion.button>
            </motion.div>
          ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass"
            style={{
              padding: "24px 28px",
              borderRadius: 20,
              border: isDragOver ? "2px dashed var(--primary)" : "1.5px solid var(--border)",
              marginBottom: 32,
              background: isDragOver ? "rgba(14, 165, 233, 0.05)" : "var(--glass-bg)",
              backdropFilter: "var(--glass-blur)",
              boxShadow: "0 10px 30px var(--glass-shadow)",
              transition: "all 0.25s ease"
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--badge-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary-dark)"
                  }}
                >
                  <Upload size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                    Direct Google Drive Uploader
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Drag and drop any file here, or choose a file to store securely in your vault
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 12px",
                    borderRadius: 10,
                    background: "var(--badge-bg)",
                    color: "var(--primary-dark)",
                    fontSize: "0.82rem",
                    fontWeight: 700
                  }}
                >
                  <FileCheck size={15} /> Ready: {selectedFile.name} ({formatSize(selectedFile.size)})
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center" }}>
              {/* File Input */}
              <div style={{ position: "relative" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  style={{ display: "none" }}
                  id="vault-file-input"
                />
                <label
                  htmlFor="vault-file-input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 16px",
                    borderRadius: 12,
                    border: "1.5px dashed var(--primary)",
                    background: "var(--bg-secondary)",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    color: selectedFile ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: selectedFile ? 700 : 500,
                    transition: "all 0.2s ease"
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                    {selectedFile ? `Selected: ${selectedFile.name}` : "Click to select or drag a file here..."}
                  </span>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "white",
                      border: "1px solid var(--border)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--primary-dark)",
                      flexShrink: 0
                    }}
                  >
                    Browse Files
                  </span>
                </label>
              </div>

              {/* Target Folder Selector */}
              <div style={{ minWidth: 190 }}>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "white",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "var(--text-primary)",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="auto">⚡ Auto Folder Detect</option>
                  <option value="pictures">📸 Folder: Pictures</option>
                  <option value="documents">📄 Folder: Documents</option>
                  <option value="videos">🎬 Folder: Videos</option>
                  <option value="audio">🎵 Folder: Audio</option>
                  <option value="others">📦 Folder: Others</option>
                </select>
              </div>

              {/* Submit Upload Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUploadSubmit}
                disabled={!selectedFile || uploading}
                style={{
                  padding: "12px 26px",
                  borderRadius: 12,
                  border: "none",
                  background: selectedFile
                    ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)"
                    : "var(--bg-secondary)",
                  color: selectedFile ? "white" : "var(--text-muted)",
                  fontWeight: 800,
                  fontSize: "0.92rem",
                  cursor: selectedFile ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: selectedFile ? "0 4px 14px rgba(14, 165, 233, 0.3)" : "none",
                  transition: "all 0.25s ease",
                  whiteSpace: "nowrap"
                }}
              >
                {uploading ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    <span>Uploading {uploadProgress}%...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload to Vault</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Upload Notifications */}
            <AnimatePresence>
              {uploadSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#047857",
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Success! File uploaded and saved to your Google Drive folder.</span>
                </motion.div>
              )}

              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#b91c1c",
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={16} />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c" }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          )}

          {/* ── Search, Category Filters & View Mode Bar ─────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 16
            }}
          >
            {/* Category Pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {CATEGORIES.map((c) => {
                const isSelected = activeCategory === c.id;
                const count = categoryCounts[c.id] || 0;
                const Icon = c.icon;

                return (
                  <motion.button
                    key={c.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveCategory(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      borderRadius: 12,
                      border: isSelected ? `1.5px solid var(--primary)` : "1px solid var(--border)",
                      background: isSelected ? "var(--primary)" : "var(--glass-bg)",
                      color: isSelected ? "white" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 4px 14px rgba(14, 165, 233, 0.25)" : "none",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Icon size={15} />
                    <span>{c.label}</span>
                    <span
                      style={{
                        padding: "1px 7px",
                        borderRadius: 12,
                        background: isSelected ? "rgba(255, 255, 255, 0.25)" : "var(--bg-secondary)",
                        color: isSelected ? "white" : "var(--text-muted)",
                        fontSize: "0.72rem",
                        fontWeight: 800
                      }}
                    >
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Right Controls: Search, Sort, View Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  minWidth: 220
                }}
              >
                <Search
                  size={15}
                  color="var(--text-muted)"
                  style={{ position: "absolute", left: 12, pointerEvents: "none" }}
                />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 32px 9px 36px",
                    borderRadius: 11,
                    border: "1.5px solid var(--border)",
                    background: "white",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    outline: "none",
                    color: "var(--text-primary)"
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)"
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 11,
                    border: "1.5px solid var(--border)",
                    background: "white",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="newest">🕒 Newest First</option>
                  <option value="name">🔤 Name (A-Z)</option>
                  <option value="size">📦 File Size</option>
                </select>
              </div>

              {/* Grid / List view toggle */}
              <div
                style={{
                  display: "flex",
                  padding: "3px",
                  borderRadius: 10,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)"
                }}
              >
                {[
                  { mode: "grid", icon: LayoutGrid, title: "Grid View" },
                  { mode: "list", icon: List,       title: "List View" }
                ].map(({ mode, icon: Icon, title }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    title={title}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: viewMode === mode ? "var(--primary)" : "transparent",
                      color: viewMode === mode ? "white" : "var(--text-muted)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Files Grid / List View ──────────────────────────────────── */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <div style={{ fontSize: "0.92rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Loading files from Google Drive...
              </div>
            </div>
          ) : processedFiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass"
              style={{
                padding: "60px 24px",
                textAlign: "center",
                borderRadius: 24,
                border: "1.5px solid var(--border)"
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--badge-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--primary)"
                }}
              >
                <Folder size={30} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                {searchQuery ? "No matching files found" : "No files in this folder yet"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto 20px" }}>
                {searchQuery
                  ? `No asset matches "${searchQuery}". Try a different search term or category.`
                  : "Upload documents, pictures, or assets above to store and organize them in Google Drive."}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="btn btn-secondary hover-target"
                  style={{ fontWeight: 700 }}
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary hover-target"
                  style={{ fontWeight: 700 }}
                >
                  <Upload size={16} /> Choose File to Upload
                </button>
              )}
            </motion.div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ────────────────────────────────────────── */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                gap: 20
              }}
            >
              {processedFiles.map((file) => {
                const { icon: Icon, color, bg } = getFileIcon(file.category);
                const isImage = file.category === "pictures" || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

                return (
                  <motion.div
                    key={file.id}
                    className="glass hover-target"
                    whileHover={{ y: -4, boxShadow: "0 16px 36px var(--glass-shadow)" }}
                    style={{
                      borderRadius: 18,
                      overflow: "hidden",
                      border: "1.5px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.25s ease",
                      background: "var(--glass-bg)"
                    }}
                  >
                    {/* Image Preview Banner if Image */}
                    {isImage && file.webViewLink ? (
                      <div
                        onClick={() => setPreviewFile(file)}
                        style={{
                          height: 150,
                          width: "100%",
                          overflow: "hidden",
                          position: "relative",
                          cursor: "pointer",
                          background: "var(--bg-secondary)"
                        }}
                      >
                        <img
                          src={file.webViewLink}
                          alt={file.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.3s ease"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            padding: "4px 8px",
                            borderRadius: 8,
                            background: "rgba(0,0,0,0.65)",
                            color: "white",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backdropFilter: "blur(4px)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          <Eye size={12} /> Preview
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: 70,
                          padding: "16px 18px",
                          background: `linear-gradient(135deg, ${bg} 0%, transparent 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: color,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: "white",
                            color: color,
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                          }}
                        >
                          {file.category || "file"}
                        </span>
                      </div>
                    )}

                    {/* Card Body */}
                    <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "0.92rem",
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginBottom: 4
                          }}
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            fontWeight: 600
                          }}
                        >
                          <span>{formatSize(file.size)}</span>
                          <span>•</span>
                          <span style={{ textTransform: "capitalize" }}>{file.category || "Asset"}</span>
                        </div>
                      </div>

                      {/* Action Links & Delete */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 16,
                          paddingTop: 12,
                          borderTop: "1px solid var(--border)"
                        }}
                      >
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                              padding: "8px 12px",
                              borderRadius: 10,
                              background: "var(--badge-bg)",
                              color: "var(--primary-dark)",
                              textDecoration: "none",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              transition: "all 0.2s ease"
                            }}
                          >
                            <ExternalLink size={13} /> Open
                          </a>
                        )}

                        {file.webContentLink && (
                          <a
                            href={file.webContentLink}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                              padding: "8px 12px",
                              borderRadius: 10,
                              background: "var(--bg-secondary)",
                              color: "var(--text-secondary)",
                              textDecoration: "none",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              transition: "all 0.2s ease"
                            }}
                          >
                            <Download size={13} /> Download
                          </a>
                        )}

                        {deleteConfirmId === file.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => handleDelete(file.id)}
                              title="Confirm Delete"
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 800
                              }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              title="Cancel"
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: "var(--bg-secondary)",
                                color: "var(--text-secondary)",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700
                              }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(file.id)}
                            title="Delete file"
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              background: "rgba(239,68,68,0.08)",
                              color: "#ef4444",
                              border: "none",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* ── LIST VIEW ────────────────────────────────────────── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {processedFiles.map((file) => {
                const { icon: Icon, color, bg } = getFileIcon(file.category);
                const isImage = file.category === "pictures" || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

                return (
                  <motion.div
                    key={file.id}
                    className="glass hover-target"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ x: 4 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 20px",
                      borderRadius: 16,
                      border: "1.5px solid var(--border)",
                      background: "var(--glass-bg)"
                    }}
                  >
                    {/* Icon or Thumbnail */}
                    {isImage && file.webViewLink ? (
                      <div
                        onClick={() => setPreviewFile(file)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          overflow: "hidden",
                          cursor: "pointer",
                          flexShrink: 0,
                          border: "1px solid var(--border)"
                        }}
                      >
                        <img src={file.webViewLink} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: color,
                          flexShrink: 0
                        }}
                      >
                        <Icon size={20} />
                      </div>
                    )}

                    {/* File Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "0.92rem",
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          marginTop: 2
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: bg,
                            color: color,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            fontSize: "0.68rem"
                          }}
                        >
                          {file.category || "file"}
                        </span>
                        <span>{formatSize(file.size)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "8px 14px",
                            borderRadius: 10,
                            background: "var(--badge-bg)",
                            color: "var(--primary-dark)",
                            textDecoration: "none",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}
                        >
                          <ExternalLink size={13} /> View
                        </a>
                      )}

                      {file.webContentLink && (
                        <a
                          href={file.webContentLink}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "8px 14px",
                            borderRadius: 10,
                            background: "var(--bg-secondary)",
                            color: "var(--text-secondary)",
                            textDecoration: "none",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}
                        >
                          <Download size={13} /> Download
                        </a>
                      )}

                      {deleteConfirmId === file.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => handleDelete(file.id)}
                            style={{
                              padding: "7px 12px",
                              borderRadius: 8,
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 800
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 8,
                              background: "var(--bg-secondary)",
                              color: "var(--text-secondary)",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 700
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(file.id)}
                          title="Delete"
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "none",
                            background: "rgba(239,68,68,0.08)",
                            color: "#ef4444",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* ── Image Preview Lightbox Modal ────────────────────────────── */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setPreviewFile(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              zIndex: 1000
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                position: "relative",
                maxWidth: "85vw",
                maxHeight: "88vh",
                background: "rgba(15, 23, 42, 0.92)",
                backdropFilter: "blur(20px)",
                padding: "24px",
                borderRadius: 24,
                boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewFile(null)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}
              >
                <X size={18} />
              </button>

              {/* Preview Image */}
              <div style={{ maxWidth: "100%", maxHeight: "68vh", overflow: "hidden", borderRadius: 16, marginBottom: 16 }}>
                <img
                  src={previewFile.webViewLink}
                  alt={previewFile.name}
                  style={{ maxWidth: "100%", maxHeight: "68vh", objectFit: "contain", borderRadius: 16, display: "block" }}
                />
              </div>

              {/* Modal Footer Info & Actions */}
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ color: "white", fontWeight: 800, fontSize: "0.95rem" }}>{previewFile.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", marginTop: 2 }}>
                    Size: {formatSize(previewFile.size)} • Folder: {previewFile.category || "pictures"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {previewFile.webViewLink && (
                    <a
                      href={previewFile.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.15)",
                        color: "white",
                        textDecoration: "none",
                        fontSize: "0.82rem",
                        fontWeight: 700
                      }}
                    >
                      <ExternalLink size={14} /> Open in Drive
                    </a>
                  )}
                  {previewFile.webContentLink && (
                    <a
                      href={previewFile.webContentLink}
                      download={previewFile.name}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        borderRadius: 10,
                        background: "var(--primary)",
                        color: "white",
                        textDecoration: "none",
                        fontSize: "0.82rem",
                        fontWeight: 700
                      }}
                    >
                      <Download size={14} /> Download Image
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
