import { useState, useEffect, useRef } from "react";
import { useDrive } from "../context/DriveContext";
import Sidebar from "../components/Sidebar";
import { Plus, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function Gallery() {
  const drive = useDrive();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    drive.readFile("gallery.json").then((d) => {
      setPhotos(d || []);
      setLoading(false);
    });
  }, [drive]);

  const savePhotos = async (p) => {
    setPhotos(p);
    await drive.writeFile("gallery.json", p);
  };

  const handleUpload = async (files) => {
    setUploading(true);
    const newPhotos = [];
    for (const file of Array.from(files)) {
      const driveFile = await drive.uploadFile(file, "pictures");
      if (driveFile) {
        newPhotos.push({
          id: Date.now().toString() + Math.random(),
          driveFileId: driveFile.id,
          webViewLink: driveFile.webViewLink,
          name: file.name,
          uploadedAt: new Date().toISOString()
        });
      }
    }
    await savePhotos([...newPhotos, ...photos]);
    setUploading(false);
  };

  const deletePhoto = async (photo) => {
    if (photo.driveFileId) {
      await drive.deleteFile(photo.driveFileId);
    }
    await savePhotos(photos.filter(p => p.id !== photo.id));
    if (lightbox?.id === photo.id) setLightbox(null);
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main className="main-content">
        <div style={{ maxWidth: 1160, margin: "0 auto", width: "100%" }}>
          <div className="flex-between" style={{ marginBottom: "28px" }}>
            <div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 900 }}>Photo Gallery</h1>
              <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>{photos.length} private visual memories in Drive Vault</p>
            </div>
            <button className="btn btn-primary hover-target" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Uploading...</> : <><Plus size={16} /> Add Photos</>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => e.target.files && handleUpload(e.target.files)} />
          </div>

          {loading ? (
            <div className="flex-center" style={{ padding: "60px" }}><div className="spinner" /></div>
          ) : photos.length === 0 ? (
            <div className="glass" style={{ padding: 48, textAlign: "center", borderRadius: 20 }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📷</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 8 }}>No photos yet</h3>
              <p style={{ color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 20px" }}>Upload your personal memories and they will be stored safely in your Google Drive Vault.</p>
              <button className="btn btn-primary hover-target" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Upload Photos
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  className="glass hover-target"
                  whileHover={{ y: -4, boxShadow: "0 16px 36px var(--glass-shadow)" }}
                  style={{ overflow: "hidden", borderRadius: 16, cursor: "pointer", position: "relative", height: 220 }}
                  onClick={() => setLightbox(photo)}
                >
                  {photo.webViewLink ? (
                    <img src={photo.webViewLink} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="flex-center" style={{ width: "100%", height: "100%", background: "var(--bg-secondary)" }}>
                      <ImageIcon size={32} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", color: "white", fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {photo.name}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {lightbox && (
        <div className="modal-overlay" onClick={() => setLightbox(null)}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-icon" onClick={() => setLightbox(null)} style={{ position: "absolute", top: -16, right: -16, background: "white", zIndex: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              <X size={18} />
            </button>
            <button className="btn btn-icon" onClick={() => deletePhoto(lightbox)} style={{ position: "absolute", top: -16, right: 32, background: "white", zIndex: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", color: "var(--danger)" }}>
              <Trash2 size={18} />
            </button>
            {lightbox.webViewLink && (
              <img src={lightbox.webViewLink} alt={lightbox.name} style={{ maxWidth: "85vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "var(--radius)" }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
