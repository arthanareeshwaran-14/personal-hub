import { useState, useEffect, useMemo } from "react";
import { useDrive } from "../context/DriveContext";
import Sidebar from "../components/Sidebar";
import { Plus, X, Target, CheckCircle2, AlignLeft, Kanban, ChevronDown, ChevronUp, Clock, TrendingUp, Star, BarChart3, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATS = [
  { label: "Career", icon: "💼" },{ label: "Personal", icon: "🌱" },{ label: "Education", icon: "📚" },
  { label: "Financial", icon: "💰" },{ label: "Travel", icon: "✈️" },{ label: "Health", icon: "❤️" },
  { label: "Skills", icon: "⚡" },{ label: "Side Projects", icon: "🚀" },{ label: "Tech", icon: "💻" },{ label: "Relationships", icon: "🤝" },
];
const PRIORITIES = [
  { key: "p1", label: "P1 Critical", color: "#ef4444" },
  { key: "p2", label: "P2 High", color: "#f97316" },
  { key: "p3", label: "P3 Medium", color: "#f59e0b" },
  { key: "p4", label: "P4 Low", color: "#6b7280" },
];
const STATUS_CONFIG = {
  "not-started": { label: "Not Started", color: "#94a3b8" },
  "in-progress": { label: "In Progress", color: "#f59e0b" },
  "done": { label: "Done", color: "#10b981" },
};
const QUOTES = [
  { text: "A dream written down with a date becomes a goal.", author: "Greg S. Reid" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It always seems impossible until it`s done.", author: "Nelson Mandela" },
  { text: "You don`t have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
];

function DeadlineBadge({ dateStr }) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr + "-01") - new Date()) / (1000*60*60*24));
  const overdue = days < 0; const urgent = days >= 0 && days <= 7;
  const color = overdue ? "#ef4444" : urgent ? "#f97316" : "#6b7280";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, color, background: color+"18", padding: "3px 8px", borderRadius: 20, border: `1px solid ${color}33`, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Clock size={11} />
      {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today!" : `${days}d left`}
    </span>
  );
}

export default function Roadmap() {
  const drive = useDrive();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  const [yearFilter, setYearFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [editSubtask, setEditSubtask] = useState({});
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");
  const [form, setForm] = useState({ title: "", desc: "", category: "Career", targetDate: "", status: "not-started", priority: "p3", progress: 0, tags: [], subtasks: [] });
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  useEffect(() => {
    drive.readFile("roadmap.json").then(res => {
      if (res) setItems(res.sort((a,b) => new Date(a.targetDate)-new Date(b.targetDate)));
      setLoading(false);
    });
  }, [drive]);

  const save = async (newItems) => {
    setItems(newItems.sort((a,b) => new Date(a.targetDate)-new Date(b.targetDate)));
    await drive.writeFile("roadmap.json", newItems);
  };

  const handleAdd = () => {
    if (!form.title) return;
    save([...items, { ...form, id: Date.now().toString() }]);
    setShowModal(false);
    setForm({ title: "", desc: "", category: "Career", targetDate: "", status: "not-started", priority: "p3", progress: 0, tags: [], subtasks: [] });
    setNewSubtask(""); setNewTag("");
  };

  const cycleStatus = (id) => {
    const order = ["not-started","in-progress","done"];
    const updated = items.map(item => {
      if (item.id !== id) return item;
      const next = order[(order.indexOf(item.status)+1)%order.length];
      return { ...item, status: next, progress: next === "done" ? 100 : item.progress };
    });
    save(updated);
  };

  const updateProgress = (id, val) => save(items.map(item => item.id !== id ? item : { ...item, progress: Number(val) }));

  const toggleSubtask = (itemId, stId) => {
    const updated = items.map(item => {
      if (item.id !== itemId) return item;
      const subtasks = (item.subtasks||[]).map(st => st.id === stId ? { ...st, done: !st.done } : st);
      const done = subtasks.filter(s=>s.done).length;
      const progress = subtasks.length ? Math.round((done/subtasks.length)*100) : item.progress;
      return { ...item, subtasks, progress };
    });
    save(updated);
  };

  const years = useMemo(() => {
    const ys = new Set(items.map(i=>i.targetDate?.slice(0,4)).filter(Boolean));
    return ["all",...Array.from(ys).sort()];
  }, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (yearFilter !== "all" && i.targetDate?.slice(0,4) !== yearFilter) return false;
    if (catFilter !== "all" && i.category !== catFilter) return false;
    return true;
  }), [items, yearFilter, catFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter(i=>i.status==="done").length,
    inProgress: items.filter(i=>i.status==="in-progress").length,
    pct: items.length ? Math.round(items.filter(i=>i.status==="done").length/items.length*100) : 0,
  }), [items]);

  if (loading) return <div style={{display:"flex"}}><Sidebar /><main className="main-content flex-center"><div className="spinner"/></main></div>;

  const MilestoneCard = ({ item, index }) => {
    const priColor = PRIORITIES.find(p=>p.key===item.priority)?.color||"#6b7280";
    const stDone = (item.subtasks||[]).filter(s=>s.done).length;
    const stTotal = (item.subtasks||[]).length;
    return (
      <motion.div key={item.id} initial={{opacity:0,x:-30}} animate={{opacity:1,x:0}} exit={{opacity:0,scale:0.9}} transition={{duration:0.4,delay:index*0.06}} style={{position:"relative",marginBottom:28}}>
        <div className="hover-target" onClick={()=>cycleStatus(item.id)} style={{position:"absolute",left:-34,top:6,width:20,height:20,borderRadius:"50%",background:item.status==="done"?"#10b981":item.status==="in-progress"?"#f59e0b":"var(--bg-primary)",border:`3px solid ${STATUS_CONFIG[item.status].color}`,cursor:"pointer",zIndex:2,display:"flex",alignItems:"center",justifyContent:"center",color:"white"}}>
          {item.status==="done" && <CheckCircle2 size={12}/>}
        </div>
        <div className="glass hover-target" style={{padding:22,marginLeft:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{padding:"3px 10px",borderRadius:20,background:"var(--bg-secondary)",border:"1px solid var(--border)",fontSize:"0.76rem",fontWeight:700}}>{CATS.find(c=>c.label===item.category)?.icon} {item.category}</span>
              <span style={{fontSize:"0.72rem",fontWeight:700,color:priColor,background:priColor+"18",padding:"3px 8px",borderRadius:20}}>{PRIORITIES.find(p=>p.key===item.priority)?.label}</span>
              {item.targetDate && <DeadlineBadge dateStr={item.targetDate}/>}
              {item.targetDate && <span style={{fontSize:"0.75rem",color:"var(--primary)",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Target size={12}/> {new Date(item.targetDate+"-01").toLocaleDateString(undefined,{month:"short",year:"numeric"})}</span>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn-icon" onClick={e=>{e.stopPropagation();setExpanded(p=>({...p,[item.id]:!p[item.id]}))}}>
                {expanded[item.id]?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
              </button>
              <button className="btn-icon" onClick={e=>{e.stopPropagation();save(items.filter(i=>i.id!==item.id))}}><X size={16}/></button>
            </div>
          </div>
          <h3 style={{fontSize:"1.15rem",fontWeight:800,marginBottom:6,textDecoration:item.status==="done"?"line-through":"none",opacity:item.status==="done"?0.6:1}}>{item.title}</h3>
          {item.desc && <p style={{color:"var(--text-secondary)",fontSize:"0.9rem",lineHeight:1.6,marginBottom:10}}>{item.desc}</p>}
          <div style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:"0.74rem",color:"var(--text-muted)",fontWeight:600}}>Progress</span>
              <span style={{fontSize:"0.74rem",fontWeight:800,color:"var(--primary)"}}>{item.progress||0}%</span>
            </div>
            <div style={{height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
              <motion.div animate={{width:`${item.progress||0}%`}} style={{height:"100%",background:"linear-gradient(90deg,var(--primary),var(--primary-dark))",borderRadius:3}}/>
            </div>
            <input type="range" min={0} max={100} value={item.progress||0} onChange={e=>{e.stopPropagation();updateProgress(item.id,e.target.value)}} onClick={e=>e.stopPropagation()} style={{width:"100%",marginTop:4,cursor:"pointer"}}/>
          </div>
          {item.tags?.length>0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{item.tags.map((tag,ti)=><span key={ti} style={{padding:"2px 8px",borderRadius:12,background:"var(--badge-bg)",fontSize:"0.72rem",fontWeight:700,color:"var(--primary-dark)"}}>#{tag}</span>)}</div>}
          {stTotal>0 && <div style={{fontSize:"0.78rem",color:"var(--text-muted)",fontWeight:600,marginBottom:6}}>✅ {stDone}/{stTotal} sub-tasks</div>}
          <AnimatePresence>
            {expanded[item.id] && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} style={{marginTop:12,padding:14,borderRadius:12,background:"var(--bg-secondary)",border:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
                <div style={{fontSize:"0.8rem",fontWeight:700,color:"var(--text-secondary)",marginBottom:8}}>Sub-tasks</div>
                {(item.subtasks||[]).map(st=>(
                  <div key={st.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                    <input type="checkbox" checked={st.done} onChange={()=>toggleSubtask(item.id,st.id)} style={{cursor:"pointer"}}/>
                    <span style={{fontSize:"0.86rem",textDecoration:st.done?"line-through":"none",opacity:st.done?0.5:1}}>{st.text}</span>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input value={editSubtask[item.id]||""} onChange={e=>setEditSubtask(p=>({...p,[item.id]:e.target.value}))} placeholder="Add sub-task..." style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid var(--border)",fontSize:"0.84rem",outline:"none",background:"var(--bg-primary)"}} onKeyDown={e=>{if(e.key==="Enter"&&editSubtask[item.id]?.trim()){save(items.map(i=>i.id!==item.id?i:{...i,subtasks:[...(i.subtasks||[]),{id:Date.now().toString(),text:editSubtask[item.id],done:false}]}));setEditSubtask(p=>({...p,[item.id]:""}));}}}/>
                  <button onClick={()=>{if(!editSubtask[item.id]?.trim())return;save(items.map(i=>i.id!==item.id?i:{...i,subtasks:[...(i.subtasks||[]),{id:Date.now().toString(),text:editSubtask[item.id],done:false}]}));setEditSubtask(p=>({...p,[item.id]:""}));}} style={{padding:"6px 14px",borderRadius:8,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:700,fontSize:"0.82rem"}}>Add</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <main className="main-content">
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} style={{padding:"14px 20px",borderRadius:14,background:"linear-gradient(135deg,var(--badge-bg),var(--bg-secondary))",border:"1px solid var(--border)",marginBottom:28,display:"flex",alignItems:"center",gap:14}}>
          <Star size={18} color="var(--primary)" style={{flexShrink:0}}/>
          <div>
            <div style={{fontSize:"0.88rem",fontWeight:600,color:"var(--text-primary)",fontStyle:"italic"}}>"{quote.text}"</div>
            <div style={{fontSize:"0.74rem",color:"var(--text-muted)",marginTop:3}}>— {quote.author}</div>
          </div>
        </motion.div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:16}}>
          <div>
            <h1 style={{fontSize:"2rem",fontWeight:900,margin:0}}>Future Roadmap</h1>
            <p style={{color:"var(--text-secondary)",marginTop:4}}>Track your milestones and long-term goals.</p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{display:"flex",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
              <button onClick={()=>setViewMode("timeline")} style={{padding:"8px 16px",border:"none",background:viewMode==="timeline"?"var(--primary)":"transparent",color:viewMode==="timeline"?"white":"var(--text-secondary)",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><AlignLeft size={14}/> Timeline</button>
              <button onClick={()=>setViewMode("kanban")} style={{padding:"8px 16px",border:"none",background:viewMode==="kanban"?"var(--primary)":"transparent",color:viewMode==="kanban"?"white":"var(--text-secondary)",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><Kanban size={14}/> Board</button>
            </div>
            <button className="btn btn-primary hover-target" onClick={()=>setShowModal(true)}><Plus size={18}/> Add Milestone</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:14,marginBottom:28}}>
          {[{label:"Total",value:stats.total,color:"var(--primary)"},{label:"In Progress",value:stats.inProgress,color:"#f59e0b"},{label:"Completed",value:stats.done,color:"#10b981"},{label:"Done %",value:stats.pct+"%",color:"#8b5cf6"}].map(s=>(
            <div key={s.label} className="glass" style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
              <div>
                <div style={{fontSize:"1.4rem",fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:"0.72rem",color:"var(--text-muted)",fontWeight:600}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {years.map(y=><button key={y} onClick={()=>setYearFilter(y)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:yearFilter===y?"var(--primary)":"transparent",color:yearFilter===y?"white":"var(--text-secondary)",fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>{y==="all"?"All Years":y}</button>)}
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:"7px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg-secondary)",fontWeight:600,fontSize:"0.82rem",outline:"none",cursor:"pointer"}}>
            <option value="all">All Categories</option>
            {CATS.map(c=><option key={c.label} value={c.label}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        {viewMode==="timeline" ? (
          <div style={{position:"relative",paddingLeft:40}}>
            <div style={{position:"absolute",left:15,top:10,bottom:0,width:2,background:"var(--border)",borderRadius:2}}/>
            {filtered.length===0 && <p style={{color:"var(--text-muted)",paddingLeft:10}}>No milestones match. Plan your future!</p>}
            <AnimatePresence>{filtered.map((item,index)=><MilestoneCard key={item.id} item={item} index={index}/>)}</AnimatePresence>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,alignItems:"start"}}>
            {["not-started","in-progress","done"].map(status=>{
              const col=STATUS_CONFIG[status];
              const colItems=filtered.filter(i=>i.status===status);
              return (
                <div key={status} style={{background:"var(--bg-secondary)",borderRadius:16,padding:18,border:"1px solid var(--border)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:col.color}}/>
                    <span style={{fontWeight:800,fontSize:"0.88rem"}}>{col.label}</span>
                    <span style={{marginLeft:"auto",background:"var(--border)",borderRadius:20,padding:"1px 8px",fontSize:"0.76rem",fontWeight:700}}>{colItems.length}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {colItems.map(item=>{
                      const priColor=PRIORITIES.find(p=>p.key===item.priority)?.color||"#6b7280";
                      return (
                        <div key={item.id} className="glass" style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>cycleStatus(item.id)}>
                          <span style={{fontSize:"0.7rem",fontWeight:700,color:priColor,background:priColor+"15",padding:"2px 7px",borderRadius:10}}>{PRIORITIES.find(p=>p.key===item.priority)?.label}</span>
                          <div style={{fontWeight:800,fontSize:"0.92rem",marginTop:6,marginBottom:4}}>{item.title}</div>
                          {item.targetDate && <div style={{fontSize:"0.74rem",color:"var(--text-muted)"}}><Target size={11} style={{display:"inline"}}/> {new Date(item.targetDate+"-01").toLocaleDateString(undefined,{month:"short",year:"numeric"})}</div>}
                          {(item.progress||0)>0 && <div style={{marginTop:8,height:4,background:"var(--border)",borderRadius:2}}><div style={{width:`${item.progress}%`,height:"100%",background:col.color,borderRadius:2}}/></div>}
                        </div>
                      );
                    })}
                    {colItems.length===0 && <div style={{textAlign:"center",padding:"20px 0",color:"var(--text-muted)",fontSize:"0.82rem"}}>No items</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <AnimatePresence>
          {showModal && (
            <div className="modal-overlay" onClick={()=>setShowModal(false)}>
              <motion.div className="glass modal" style={{maxWidth:540,width:"100%",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()} initial={{opacity:0,y:50,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:0.9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"24px 24px 0"}}>
                  <h3 style={{fontSize:"1.2rem",fontWeight:800}}>New Milestone</h3>
                  <button className="btn-icon" onClick={()=>setShowModal(false)}><X size={20}/></button>
                </div>
                <div style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
                  <div>
                    <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Title *</label>
                    <input className="input hover-target" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="E.g., Launch startup"/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Description</label>
                    <textarea className="input hover-target" rows={3} value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="Details..." style={{resize:"vertical"}}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div>
                      <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Category</label>
                      <select className="input hover-target" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c.label}>{c.label}</option>)}</select>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Priority</label>
                      <select className="input hover-target" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Target Date</label>
                      <input type="month" className="input hover-target" value={form.targetDate} onChange={e=>setForm({...form,targetDate:e.target.value})}/>
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Progress %</label>
                      <input type="number" min={0} max={100} className="input hover-target" value={form.progress} onChange={e=>setForm({...form,progress:Number(e.target.value)})}/>
                    </div>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Tags</label>
                    <div style={{display:"flex",gap:8}}>
                      <input className="input hover-target" value={newTag} onChange={e=>setNewTag(e.target.value)} placeholder="Add tag..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newTag.trim()){setForm(f=>({...f,tags:[...f.tags,newTag.trim()]}));setNewTag("");}}}/>
                      <button onClick={()=>{if(newTag.trim()){setForm(f=>({...f,tags:[...f.tags,newTag.trim()]}));setNewTag("");}}} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:700}}>Add</button>
                    </div>
                    {form.tags.length>0 && <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>{form.tags.map((tag,i)=><span key={i} style={{padding:"3px 10px",borderRadius:12,background:"var(--badge-bg)",fontSize:"0.76rem",fontWeight:700,color:"var(--primary-dark)",display:"flex",alignItems:"center",gap:4}}>#{tag}<button onClick={()=>setForm(f=>({...f,tags:f.tags.filter((_,j)=>j!==i)}))} style={{border:"none",background:"none",cursor:"pointer",color:"inherit",padding:0,lineHeight:1}}><X size={10}/></button></span>)}</div>}
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:"0.8rem",fontWeight:700,marginBottom:6,color:"var(--text-secondary)"}}>Sub-tasks</label>
                    <div style={{display:"flex",gap:8}}>
                      <input className="input hover-target" value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} placeholder="Add sub-task..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newSubtask.trim()){setForm(f=>({...f,subtasks:[...f.subtasks,{id:Date.now().toString(),text:newSubtask,done:false}]}));setNewSubtask("");}}}/>
                      <button onClick={()=>{if(newSubtask.trim()){setForm(f=>({...f,subtasks:[...f.subtasks,{id:Date.now().toString(),text:newSubtask,done:false}]}));setNewSubtask("");}}} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:700}}>Add</button>
                    </div>
                    {form.subtasks.map((st,i)=><div key={st.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border)"}}><span style={{fontSize:"0.84rem"}}>• {st.text}</span><button onClick={()=>setForm(f=>({...f,subtasks:f.subtasks.filter((_,j)=>j!==i)}))} style={{border:"none",background:"none",cursor:"pointer",color:"#ef4444",marginLeft:"auto"}}><X size={14}/></button></div>)}
                  </div>
                  <button className="btn btn-primary hover-target" onClick={handleAdd} style={{marginTop:8,width:"100%",justifyContent:"center",padding:"14px"}}><Plus size={18}/> Add Milestone</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
