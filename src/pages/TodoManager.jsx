import { useState, useEffect, useRef } from "react";
import { useDrive } from "../context/DriveContext";
import Sidebar from "../components/Sidebar";
import { Plus, X, Check, Trash2, Calendar, Flag, Circle, Timer, Zap, FolderPlus, ChevronDown, ChevronRight, AlertCircle, Target, Clock, Sun, Star, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRIORITIES = { high: "#ef4444", medium: "#f59e0b", low: "#10b981", none: "#94a3b8" };
const PRI_LABELS = { high: "P1 High", medium: "P2 Med", low: "P3 Low", none: "P4" };
const VIEWS = ["Today", "Upcoming", "Someday", "All"];

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); const n = new Date();
  return d.toDateString() === n.toDateString();
}
function isUpcoming(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); const n = new Date();
  return d > n && !isToday(dateStr);
}
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(23,59,59);
  return d < new Date() && !isToday(dateStr);
}

function PomodoroTimer({ taskText, onClose }) {
  const [secs, setSecs] = useState(25*60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("focus");
  const intRef = useRef(null);
  useEffect(() => {
    if (running) { intRef.current = setInterval(() => setSecs(s => { if(s<=1){clearInterval(intRef.current);setRunning(false);setPhase(p=>p==="focus"?"break":"focus");setSecs(p=>p==="focus"?5*60:25*60);return 0;} return s-1;}),1000); }
    return () => clearInterval(intRef.current);
  }, [running]);
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const pct = phase==="focus"?(1-(secs/(25*60)))*100:(1-(secs/(5*60)))*100;
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}}>
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="glass" style={{padding:40,borderRadius:28,maxWidth:380,width:"100%",textAlign:"center",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)"}}><X size={20}/></button>
        <div style={{fontSize:"0.8rem",fontWeight:700,color:phase==="focus"?"var(--primary)":"#10b981",textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{phase==="focus"?"Focus Time":"Short Break"}</div>
        <div style={{fontSize:"0.88rem",color:"var(--text-secondary)",marginBottom:20,fontWeight:600}}>{taskText}</div>
        <svg width={160} height={160} style={{margin:"0 auto 24px",display:"block"}}>
          <circle cx={80} cy={80} r={70} fill="none" stroke="var(--border)" strokeWidth={8}/>
          <circle cx={80} cy={80} r={70} fill="none" stroke={phase==="focus"?"var(--primary)":"#10b981"} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${2*Math.PI*70}`} strokeDashoffset={`${2*Math.PI*70*(1-pct/100)}`} style={{transform:"rotate(-90deg)",transformOrigin:"80px 80px",transition:"stroke-dashoffset 1s linear"}}/>
          <text x={80} y={88} textAnchor="middle" style={{fontSize:"2rem",fontWeight:900,fill:"var(--text-primary)",fontFamily:"monospace"}}>{fmt(secs)}</text>
        </svg>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={()=>setRunning(r=>!r)} style={{padding:"12px 28px",borderRadius:12,border:"none",background:running?"#ef4444":"var(--primary)",color:"white",fontWeight:800,cursor:"pointer",fontSize:"0.95rem"}}>{running?"Pause":"Start"}</button>
          <button onClick={()=>{setSecs(phase==="focus"?25*60:5*60);setRunning(false);}} style={{padding:"12px 20px",borderRadius:12,border:"1.5px solid var(--border)",background:"transparent",fontWeight:700,cursor:"pointer"}}>Reset</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TodoManager() {
  const drive = useDrive();
  const [todos, setTodos] = useState([]);
  const [sections, setSections] = useState(["Personal","Work","Study"]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [section, setSection] = useState("Personal");
  const [newSection, setNewSection] = useState("");
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [activeView, setActiveView] = useState("Today");
  const [focusTask, setFocusTask] = useState(null);
  const [pomodoroTask, setPomodoroTask] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [newSubtask, setNewSubtask] = useState({});
  const [filterPri, setFilterPri] = useState("all");

  useEffect(() => {
    drive.readFile("todos.json").then(res => {
      if (res?.todos) { setTodos(res.todos); if(res.sections) setSections(res.sections); }
      else if (Array.isArray(res)) setTodos(res);
      setLoading(false);
    });
  }, [drive]);

  const save = async (newTodos, newSecs = sections) => {
    setTodos(newTodos);
    await drive.writeFile("todos.json", { todos: newTodos, sections: newSecs });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const todo = { id: Date.now().toString(), text: newTask, done: false, priority, dueDate, section, subtasks: [], note: "", createdAt: new Date().toISOString() };
    save([todo, ...todos]);
    setNewTask(""); setPriority("none"); setDueDate("");
  };

  const toggle = (id) => save(todos.map(t => t.id===id ? {...t,done:!t.done} : t));
  const remove = (id) => save(todos.filter(t => t.id!==id));
  const toggleSubtask = (tid, sid) => save(todos.map(t => t.id!==tid?t:{...t,subtasks:(t.subtasks||[]).map(s=>s.id===sid?{...s,done:!s.done}:s)}));
  const addSubtask = (tid) => {
    if (!newSubtask[tid]?.trim()) return;
    save(todos.map(t => t.id!==tid?t:{...t,subtasks:[...(t.subtasks||[]),{id:Date.now().toString(),text:newSubtask[tid],done:false}]}));
    setNewSubtask(p=>({...p,[tid]:""}));
  };

  const addSection = () => {
    if (!newSection.trim() || sections.includes(newSection.trim())) return;
    const newSecs = [...sections, newSection.trim()];
    setSections(newSecs);
    save(todos, newSecs);
    setNewSection(""); setShowSectionInput(false);
  };

  const getFiltered = (view) => {
    let filtered = todos;
    if (filterPri !== "all") filtered = filtered.filter(t => t.priority === filterPri);
    switch(view) {
      case "Today": return filtered.filter(t => isToday(t.dueDate) || (!t.dueDate && !t.done));
      case "Upcoming": return filtered.filter(t => isUpcoming(t.dueDate));
      case "Someday": return filtered.filter(t => !t.dueDate && !t.done);
      default: return filtered;
    }
  };

  const grouped = {};
  const viewTodos = getFiltered(activeView);
  sections.forEach(sec => { grouped[sec] = viewTodos.filter(t => t.section===sec); });
  const unsectioned = viewTodos.filter(t => !sections.includes(t.section));
  if (unsectioned.length) grouped["Other"] = unsectioned;

  const doneTodos = todos.filter(t => t.done);

  if (loading) return <div style={{display:"flex"}}><Sidebar/><main className="main-content flex-center"><div className="spinner"/></main></div>;

  return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <main className="main-content">
        {focusTask && (
          <div style={{position:"fixed",inset:0,zIndex:190,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)",backdropFilter:"blur(12px)"}}>
            <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="glass" style={{padding:48,borderRadius:32,maxWidth:500,width:"100%",textAlign:"center"}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:"var(--primary)",letterSpacing:3,marginBottom:16,textTransform:"uppercase"}}>Focus Mode</div>
              <Zap size={48} color="var(--primary)" style={{margin:"0 auto 20px"}}/>
              <div style={{fontSize:"1.5rem",fontWeight:900,marginBottom:12,lineHeight:1.3}}>{focusTask.text}</div>
              {focusTask.dueDate && <div style={{fontSize:"0.85rem",color:"var(--text-muted)",marginBottom:24}}>Due: {new Date(focusTask.dueDate).toLocaleDateString()}</div>}
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>{toggle(focusTask.id);setFocusTask(null);}} style={{padding:"12px 24px",borderRadius:12,border:"none",background:"#10b981",color:"white",fontWeight:800,cursor:"pointer"}}><Check size={16}/> Mark Done</button>
                <button onClick={()=>{setPomodoroTask(focusTask.text);setFocusTask(null);}} style={{padding:"12px 24px",borderRadius:12,border:"none",background:"var(--primary)",color:"white",fontWeight:800,cursor:"pointer"}}><Timer size={16}/> Pomodoro</button>
                <button onClick={()=>setFocusTask(null)} style={{padding:"12px 24px",borderRadius:12,border:"1.5px solid var(--border)",background:"transparent",fontWeight:700,cursor:"pointer"}}>Exit Focus</button>
              </div>
            </motion.div>
          </div>
        )}
        {pomodoroTask && <PomodoroTimer taskText={pomodoroTask} onClose={()=>setPomodoroTask(null)}/>}

        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:12}}>
            <div>
              <h1 style={{fontSize:"2rem",fontWeight:900,margin:0}}>Task Manager</h1>
              <p style={{color:"var(--text-secondary)",marginTop:4}}>{new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={filterPri} onChange={e=>setFilterPri(e.target.value)} style={{padding:"7px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg-secondary)",fontWeight:600,fontSize:"0.82rem",outline:"none"}}>
                <option value="all">All Priorities</option>
                {Object.entries(PRI_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* View tabs */}
          <div style={{display:"flex",gap:6,marginBottom:28,background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:12,padding:4,width:"fit-content"}}>
            {VIEWS.map(v=>(
              <button key={v} onClick={()=>setActiveView(v)} style={{padding:"8px 18px",borderRadius:9,border:"none",background:activeView===v?"var(--primary)":"transparent",color:activeView===v?"white":"var(--text-secondary)",fontWeight:700,fontSize:"0.84rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                {v==="Today"&&<Sun size={14}/>}{v==="Upcoming"&&<Calendar size={14}/>}{v==="Someday"&&<Star size={14}/>}{v==="All"&&<Inbox size={14}/>}
                {v}
              </button>
            ))}
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAdd} className="glass" style={{display:"flex",flexDirection:"column",gap:12,padding:18,marginBottom:28}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <Plus size={20} color="var(--primary)"/>
              <input className="hover-target" style={{flex:1,border:"none",background:"transparent",outline:"none",fontSize:"1.05rem",color:"var(--text-primary)"}} placeholder="Add a task..." value={newTask} onChange={e=>setNewTask(e.target.value)}/>
              <button type="submit" className="btn btn-primary hover-target" style={{padding:"8px 16px"}}>Add</button>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",paddingLeft:30}}>
              <select className="hover-target" style={{border:"1px solid var(--border)",background:"var(--bg-secondary)",padding:"5px 10px",borderRadius:8,color:PRIORITIES[priority],fontWeight:700,outline:"none",fontSize:"0.82rem"}} value={priority} onChange={e=>setPriority(e.target.value)}>
                {Object.entries(PRI_LABELS).map(([k,v])=><option key={k} value={k} style={{color:PRIORITIES[k]}}>{v}</option>)}
              </select>
              <input type="date" className="hover-target" style={{border:"1px solid var(--border)",background:"var(--bg-secondary)",padding:"5px 10px",borderRadius:8,outline:"none",fontSize:"0.82rem",color:"var(--text-secondary)"}} value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
              <select className="hover-target" style={{border:"1px solid var(--border)",background:"var(--bg-secondary)",padding:"5px 10px",borderRadius:8,fontWeight:600,outline:"none",fontSize:"0.82rem"}} value={section} onChange={e=>setSection(e.target.value)}>
                {sections.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </form>

          {/* Sections */}
          {Object.entries(grouped).map(([sec, secTodos]) => {
            if (secTodos.length === 0 && activeView !== "All") return null;
            const isCollapsed = collapsedSections[sec];
            return (
              <div key={sec} style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}} onClick={()=>setCollapsedSections(p=>({...p,[sec]:!p[sec]}))}>
                  {isCollapsed?<ChevronRight size={16} color="var(--text-muted)"/>:<ChevronDown size={16} color="var(--text-muted)"/>}
                  <span style={{fontWeight:800,fontSize:"0.92rem",color:"var(--text-secondary)"}}>{sec}</span>
                  <span style={{fontSize:"0.76rem",color:"var(--text-muted)",fontWeight:600,background:"var(--bg-secondary)",padding:"2px 8px",borderRadius:12,border:"1px solid var(--border)"}}>{secTodos.filter(t=>!t.done).length}</span>
                </div>
                {!isCollapsed && (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <AnimatePresence>
                      {secTodos.filter(t=>!t.done).map(todo=>{
                        const overdue = isOverdue(todo.dueDate);
                        const todayDue = isToday(todo.dueDate);
                        const stDone = (todo.subtasks||[]).filter(s=>s.done).length;
                        const stTotal = (todo.subtasks||[]).length;
                        return (
                          <motion.div key={todo.id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-50}} className="glass hover-target" style={{display:"flex",flexDirection:"column",gap:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px"}}>
                              <div onClick={()=>toggle(todo.id)} style={{cursor:"pointer",color:PRIORITIES[todo.priority],flexShrink:0}}>
                                <Circle size={22}/>
                              </div>
                              <span style={{flex:1,fontSize:"1rem",fontWeight:600}}>{todo.text}</span>
                              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                                {todo.dueDate && (
                                  <span style={{fontSize:"0.72rem",fontWeight:700,color:overdue?"#ef4444":todayDue?"#f97316":"var(--text-muted)",background:overdue?"rgba(239,68,68,0.08)":todayDue?"rgba(249,115,22,0.08)":"var(--bg-secondary)",padding:"2px 8px",borderRadius:12,border:`1px solid ${overdue?"#ef4444":todayDue?"#f97316":"var(--border)"}`,display:"flex",alignItems:"center",gap:3}}>
                                    <Calendar size={10}/>{new Date(todo.dueDate).toLocaleDateString(undefined,{month:"short",day:"numeric"})}
                                    {overdue && " ⚠️"}
                                  </span>
                                )}
                                <button onClick={()=>setFocusTask(todo)} title="Focus Mode" style={{border:"none",background:"none",cursor:"pointer",color:"var(--primary)",padding:"2px"}}><Zap size={15}/></button>
                                <button onClick={()=>setPomodoroTask(todo.text)} title="Pomodoro" style={{border:"none",background:"none",cursor:"pointer",color:"#f59e0b",padding:"2px"}}><Timer size={15}/></button>
                                <button onClick={()=>setExpandedTasks(p=>({...p,[todo.id]:!p[todo.id]}))} style={{border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)",padding:"2px"}}>
                                  {expandedTasks[todo.id]?<ChevronDown size={15}/>:<ChevronRight size={15}/>}
                                </button>
                                <button className="btn-icon hover-target" onClick={()=>remove(todo.id)}><Trash2 size={16} color="var(--danger)"/></button>
                              </div>
                            </div>
                            {stTotal>0 && <div style={{paddingLeft:52,paddingBottom:8,fontSize:"0.76rem",color:"var(--text-muted)",fontWeight:600}}>✅ {stDone}/{stTotal} sub-tasks</div>}
                            <AnimatePresence>
                              {expandedTasks[todo.id] && (
                                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} style={{paddingLeft:52,paddingBottom:16,paddingRight:18}}>
                                  {(todo.subtasks||[]).map(st=>(
                                    <div key={st.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid var(--border)"}}>
                                      <input type="checkbox" checked={st.done} onChange={()=>toggleSubtask(todo.id,st.id)} style={{cursor:"pointer"}}/>
                                      <span style={{fontSize:"0.86rem",textDecoration:st.done?"line-through":"none",opacity:st.done?0.5:1}}>{st.text}</span>
                                    </div>
                                  ))}
                                  <div style={{display:"flex",gap:8,marginTop:8}}>
                                    <input value={newSubtask[todo.id]||""} onChange={e=>setNewSubtask(p=>({...p,[todo.id]:e.target.value}))} placeholder="Add sub-task..." style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid var(--border)",fontSize:"0.84rem",outline:"none",background:"var(--bg-primary)"}} onKeyDown={e=>{if(e.key==="Enter")addSubtask(todo.id);}}/>
                                    <button onClick={()=>addSubtask(todo.id)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:700,fontSize:"0.82rem"}}>+</button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {secTodos.filter(t=>!t.done).length===0 && (
                      <div style={{textAlign:"center",padding:"16px 0",color:"var(--text-muted)",fontSize:"0.84rem"}}>All done in {sec}! 🎉</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Section */}
          <div style={{marginBottom:28}}>
            {showSectionInput ? (
              <div style={{display:"flex",gap:8}}>
                <input value={newSection} onChange={e=>setNewSection(e.target.value)} placeholder="Section name..." style={{flex:1,padding:"9px 14px",borderRadius:10,border:"1.5px solid var(--primary)",outline:"none",fontSize:"0.9rem",background:"var(--bg-primary)"}} onKeyDown={e=>{if(e.key==="Enter")addSection();if(e.key==="Escape")setShowSectionInput(false);}} autoFocus/>
                <button onClick={addSection} style={{padding:"9px 16px",borderRadius:10,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:700}}>Add</button>
                <button onClick={()=>setShowSectionInput(false)} style={{padding:"9px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"transparent",cursor:"pointer"}}><X size={16}/></button>
              </div>
            ):(
              <button onClick={()=>setShowSectionInput(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,border:"2px dashed var(--border)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:"0.84rem",width:"100%",justifyContent:"center"}}>
                <FolderPlus size={16}/> Add Section
              </button>
            )}
          </div>

          {/* Completed Tasks */}
          {doneTodos.length > 0 && (
            <div style={{marginTop:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer"}} onClick={()=>setCollapsedSections(p=>({...p,"__done":!p["__done"]}))}>
                {collapsedSections["__done"]?<ChevronRight size={16} color="var(--text-muted)"/>:<ChevronDown size={16} color="var(--text-muted)"/>}
                <Check size={16} color="#10b981"/>
                <span style={{fontWeight:800,fontSize:"0.88rem",color:"var(--text-muted)"}}>Completed</span>
                <span style={{fontSize:"0.76rem",color:"var(--text-muted)",fontWeight:600,background:"var(--bg-secondary)",padding:"2px 8px",borderRadius:12,border:"1px solid var(--border)"}}>{doneTodos.length}</span>
              </div>
              {!collapsedSections["__done"] && (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {doneTodos.map(todo=>(
                    <div key={todo.id} className="glass" style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",opacity:0.6}}>
                      <div onClick={()=>toggle(todo.id)} style={{cursor:"pointer",color:"#10b981",flexShrink:0}}><Check size={20}/></div>
                      <span style={{flex:1,fontSize:"0.95rem",textDecoration:"line-through",color:"var(--text-muted)"}}>{todo.text}</span>
                      <button className="btn-icon hover-target" onClick={()=>remove(todo.id)}><Trash2 size={15} color="#94a3b8"/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewTodos.filter(t=>!t.done).length===0 && todos.filter(t=>!t.done).length===0 && (
            <div style={{textAlign:"center",padding:"60px 0",color:"var(--text-muted)"}}>
              <Check size={48} style={{opacity:0.2,margin:"0 auto 16px"}}/>
              <p style={{fontWeight:700}}>All caught up! Enjoy your day. 🎉</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
