import React, { useState, useEffect } from 'react';
import { 
  Layout,
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  ChevronRight, 
  MoreHorizontal,
  Clock,
  AlertCircle,
  LogOut,
  Shield,
  UserPlus,
  UserX,
  UserCheck,
  Key,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Send,
  Filter,
  GanttChart,
  Download,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { supabase } from './lib/supabase';

// --- Types ---
type User = {
  id: number | string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  created_at?: string;
};

type Project = {
  id: number | string;
  name: string;
  description: string;
  owner_id: number | string;
};

type Task = {
  id: number | string;
  project_id: number | string;
  project_name?: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  health_status: 'on_track' | 'at_risk' | 'off_track' | 'due' | 'completed';
  assignee_id: number | string;
  assignee_name?: string;
  due_date: string;
  created_at?: string;
  comments_count?: number;
  attachments_count?: number;
};

type Comment = {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
};

type Attachment = {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
};

// --- Components ---

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-indigo-500/20`}>
    APM
  </div>
);

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, projects, selectedProject, onSelectProject, onAddProject }: { 
  activeTab: string, 
  setActiveTab: (tab: string) => void, 
  user: User, 
  onLogout: () => void,
  projects: Project[],
  selectedProject: Project | null,
  onSelectProject: (project: Project) => void,
  onAddProject: () => void
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: CheckSquare },
    { id: 'gantt', label: 'Gantt Chart', icon: GanttChart },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (user.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
  }

  return (
    <div className="w-64 bg-zinc-900 text-zinc-400 h-screen flex flex-col border-r border-zinc-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-3">
          <Logo />
          Advanced Project Management
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Menu</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Projects</p>
            {user.role === 'admin' && (
              <button 
                onClick={onAddProject}
                className="text-zinc-500 hover:text-white transition-colors"
                title="New Project"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                onSelectProject(project);
                setActiveTab('projects');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedProject?.id === project.id && activeTab === 'projects'
                  ? 'bg-indigo-600/20 text-indigo-400' 
                  : 'hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${selectedProject?.id === project.id ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
              <span className="text-sm font-medium truncate">{project.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white font-bold">
            {(user.full_name || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.full_name || 'User'}</p>
            <p className="text-xs text-zinc-500 truncate">{user.role}</p>
          </div>
          <button onClick={onLogout} className="text-zinc-500 hover:text-red-400">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ projects, tasks, onSelectTask }: { projects: Project[], tasks: Task[], onSelectTask: (task: Task) => void }) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today);
  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.due_date === today);

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: CheckSquare, color: 'text-blue-500' },
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Due Today', value: dueTodayTasks.length, icon: Clock, color: 'text-amber-600' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'done').length, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  const sortedUpcomingTasks = [...tasks]
    .filter(t => t.status !== 'done' && t.due_date)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-zinc-900">Welcome back!</h2>
        <p className="text-zinc-500">Here's what's happening with your projects today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-zinc-50 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-xs font-medium text-zinc-400">Live</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-sm text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-4">Recent Projects</h3>
          <div className="space-y-4">
            {projects.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-4">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {sortedUpcomingTasks.length > 0 ? sortedUpcomingTasks.map(t => (
              <div key={t.id} onClick={() => onSelectTask(t)} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{t.title}</p>
                    <p className={`text-xs font-medium ${t.due_date && t.due_date < today ? 'text-red-600' : t.due_date === today ? 'text-amber-600' : 'text-zinc-500'}`}>
                      {t.due_date && t.due_date < today ? 'Overdue: ' : t.due_date === today ? 'Due Today: ' : 'Due: '}
                      {t.due_date || 'No date'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md uppercase tracking-wider">
                  {t.status.replace('_', ' ')}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-zinc-400 italic text-sm">
                No upcoming deadlines
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskDetailModal = ({ 
  task, 
  user, 
  users,
  onClose, 
  onUpdate, 
  onDelete,
  useSupabase,
  onRefresh
}: { 
  task: Task, 
  user: User,
  users: User[],
  onClose: () => void, 
  onUpdate: (id: number | string, updates: Partial<Task>) => void,
  onDelete: (id: number | string) => Promise<boolean>,
  useSupabase: boolean,
  onRefresh?: () => void
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Task>>({
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    health_status: task.health_status,
    assignee_id: task.assignee_id,
    due_date: task.due_date
  });

  const fetchDetails = async () => {
    try {
      if (useSupabase) {
        const [cRes, aRes] = await Promise.all([
          supabase.from('comments').select('*, profiles(full_name)').eq('task_id', task.id).order('created_at', { ascending: true }),
          supabase.from('attachments').select('*, profiles(full_name)').eq('task_id', task.id)
        ]);
        
        if (cRes.data) {
          setComments(cRes.data.map((c: any) => ({
            ...c,
            user_name: c.profiles?.full_name
          })));
        }
        if (aRes.data) {
          setAttachments(aRes.data.map((a: any) => ({
            ...a,
            user_name: a.profiles?.full_name
          })));
        }
        return;
      }

      const [cRes, aRes] = await Promise.all([
        fetch(`/api/tasks/${task.id}/comments`),
        fetch(`/api/tasks/${task.id}/attachments`)
      ]);
      if (cRes.ok && aRes.ok) {
        const cData = await cRes.json();
        const aData = await aRes.json();
        if (Array.isArray(cData)) setComments(cData);
        if (Array.isArray(aData)) setAttachments(aData);
      }
    } catch (error) {
      console.error("Failed to fetch task details", error);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [task.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (useSupabase) {
      const { error } = await supabase.from('comments').insert({
        task_id: task.id,
        user_id: user.id,
        content: newComment
      });
      if (!error) {
        setNewComment('');
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        console.error("Error adding comment:", error);
        alert(`Failed to add comment: ${error.message}`);
      }
      return;
    }

    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, content: newComment })
    });
    if (res.ok) {
      setNewComment('');
      fetchDetails();
      if (onRefresh) onRefresh();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a data URL for local preview/opening if it's a small file
    let fileUrl = '#';
    if (file.size < 10 * 1024 * 1024) { // 10MB limit
      const reader = new FileReader();
      fileUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } else {
      alert("Bestand is te groot voor deze demo (max 10MB).");
      return;
    }

    if (useSupabase) {
      const { error } = await supabase.from('attachments').insert({
        task_id: task.id,
        user_id: user.id,
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type
      });
      if (!error) {
        fetchDetails();
        if (onRefresh) onRefresh();
      }
      return;
    }

    await fetch(`/api/tasks/${task.id}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type
      })
    });
    fetchDetails();
    if (onRefresh) onRefresh();
  };

  const openFile = (file: Attachment) => {
    if (file.file_url === '#') {
      alert("Dit is een placeholder en kan niet geopend worden.");
      return;
    }

    try {
      // Modern browsers block direct navigation to data: URLs.
      // We convert it to a Blob and create an Object URL instead.
      const parts = file.file_url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const url = URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Fout bij openen bestand:", e);
      alert("Kon het bestand niet openen. Probeer het opnieuw.");
    }
  };

  const handleDeleteAttachment = async (attachmentId: number | string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    if (useSupabase) {
      const { error } = await supabase.from('attachments').delete().eq('id', attachmentId);
      if (!error) {
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        console.error("Error deleting attachment:", error);
      }
      return;
    }

    const res = await fetch(`/api/attachments/${attachmentId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      fetchDetails();
      if (onRefresh) onRefresh();
    }
  };

  const handleSave = () => {
    onUpdate(task.id, editData);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              (task.health_status || 'on_track') === 'on_track' ? 'bg-emerald-100 text-emerald-600' :
              (task.health_status === 'at_risk') ? 'bg-amber-100 text-amber-600' :
              (task.health_status === 'due') ? 'bg-indigo-100 text-indigo-600' :
              (task.health_status === 'completed') ? 'bg-blue-100 text-blue-600' :
              'bg-red-100 text-red-600'
            }`}>
              {(task.health_status || 'on_track').replace('_', ' ')}
            </div>
            <h3 className="text-xl font-bold text-zinc-900">Task Details</h3>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
            )}
            {user.role === 'admin' && (
              <button 
                onClick={() => onDelete(task.id)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors ml-2">
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {isEditing ? (
              <div className="space-y-4">
                <input 
                  value={editData.title}
                  onChange={e => setEditData({...editData, title: e.target.value})}
                  className="w-full text-2xl font-bold text-zinc-900 border-b border-indigo-200 focus:border-indigo-500 outline-none pb-2"
                />
                <textarea 
                  value={editData.description}
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  rows={4}
                  className="w-full p-4 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">{task.title}</h2>
                <p className="text-zinc-600 leading-relaxed">{task.description}</p>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600" />
                Comments ({comments.length})
              </h4>
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                      {(comment.user_name || 'U').charAt(0)}
                    </div>
                    <div className="flex-1 bg-zinc-50 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-900">{comment.user_name || 'User'}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-zinc-600">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-50 p-6 rounded-2xl space-y-6">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Properties</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Assignee</span>
                  {isEditing ? (
                    <select 
                      value={editData.assignee_id || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setEditData({...editData, assignee_id: val === "" ? null : val});
                      }}
                      className="text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                        {task.assignee_name?.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-zinc-900">{task.assignee_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Status</span>
                  {isEditing ? (
                    <select 
                      value={editData.status}
                      onChange={e => setEditData({...editData, status: e.target.value as any})}
                      className="text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                      task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 
                      task.status === 'review' ? 'bg-purple-100 text-purple-600' : 
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Priority</span>
                  {isEditing ? (
                    <select 
                      value={editData.priority}
                      onChange={e => setEditData({...editData, priority: e.target.value as any})}
                      className="text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                      task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                      task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {task.priority}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Health</span>
                  {isEditing ? (
                    <select 
                      value={editData.health_status || 'on_track'}
                      onChange={e => setEditData({...editData, health_status: e.target.value as any})}
                      className="text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
                    >
                      <option value="on_track">On Track</option>
                      <option value="at_risk">At Risk</option>
                      <option value="off_track">Off Track</option>
                      <option value="due">Due</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-zinc-900 capitalize">{(task.health_status || 'on_track').replace('_', ' ')}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Due Date</span>
                  {isEditing ? (
                    <input 
                      type="date"
                      value={editData.due_date || ''}
                      onChange={e => setEditData({...editData, due_date: e.target.value})}
                      className="text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
                    />
                  ) : (
                    <span className="text-xs font-bold text-zinc-900">{task.due_date || 'No date'}</span>
                  )}
                </div>
              </div>

              {isEditing && (
                <button 
                  onClick={handleSave}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip size={16} className="text-indigo-600" />
                  Attachments ({attachments.length})
                </div>
                <label className="cursor-pointer p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors">
                  <Plus size={16} />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </h4>
              <div className="space-y-2">
                {attachments.map(file => (
                  <div key={file.id} className="group relative">
                    <button 
                      onClick={() => openFile(file)}
                      className={`w-full flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl transition-all text-left ${
                        file.file_url !== '#' ? 'hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer' : 'opacity-60 grayscale cursor-not-allowed'
                      }`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${
                        file.file_url !== '#' ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' : 'bg-zinc-50 text-zinc-400'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">{file.file_name}</p>
                          {file.file_url === '#' && (
                            <span className="text-[8px] font-bold bg-zinc-100 text-zinc-400 px-1 rounded">PLACEHOLDER</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400">Uploaded by {file.user_name}</p>
                      </div>
                      {file.file_url !== '#' && (
                        <ExternalLink size={14} className="text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                      )}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteAttachment(file.id);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Delete Attachment"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ProjectBoard = ({ project, tasks, users, user, onUpdateTask, onAddTask, onDeleteTask, onDeleteProject, onEditProject, selectedTask, onSelectTask }: { 
  project: Project, 
  tasks: Task[], 
  users: User[],
  user: User,
  onUpdateTask: (id: number | string, updates: Partial<Task>) => void,
  onAddTask: () => void,
  onDeleteTask: (id: number | string) => Promise<boolean>,
  onDeleteProject: (id: number | string) => Promise<void>,
  onEditProject: (project: Project) => void,
  selectedTask: Task | null,
  onSelectTask: (task: Task | null) => void
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = [
    { id: 'todo', label: 'To Do', color: 'bg-zinc-100' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
    { id: 'review', label: 'Review', color: 'bg-purple-50' },
    { id: 'done', label: 'Done', color: 'bg-emerald-50' },
  ];

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'mine') return t.assignee_id === user.id;
    return t.assignee_id === filter;
  });

  const getNextStatus = (current: string) => {
    const idx = columns.findIndex(c => c.id === current);
    return columns[(idx + 1) % columns.length].id;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{project.name}</h2>
          <p className="text-zinc-500">{project.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <>
              <button 
                onClick={() => onEditProject(project)}
                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Edit Project"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => {
                  if (confirm(`Are you sure you want to delete project "${project.name}"? This will delete all tasks, comments, and attachments in this project.`)) {
                    onDeleteProject(project.id);
                  }
                }}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Delete Project"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
          <div className="bg-zinc-100 p-1 rounded-xl flex gap-1 items-center">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              All Tasks
            </button>
            <button 
              onClick={() => setFilter('mine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'mine' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              My Tasks
            </button>
            
            {user.role === 'admin' && (
              <div className="flex items-center gap-1 ml-1 pl-1 border-l border-zinc-200">
                <Users size={14} className="text-zinc-400 ml-1" />
                <select 
                  value={['all', 'mine'].includes(filter) ? '' : filter}
                  onChange={(e) => setFilter(e.target.value || 'all')}
                  className="bg-transparent text-xs font-bold text-zinc-600 focus:outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <option value="">Filter by User...</option>
                  {users.filter(u => u.id !== user.id).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button 
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="text-sm font-medium">Add Task</span>
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.id} className="flex flex-col gap-4 min-w-[280px]">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{col.label}</span>
                <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <MoreHorizontal size={16} className="text-zinc-400" />
            </div>

            <div className={`flex-1 p-2 rounded-2xl border border-zinc-200/50 ${col.color} space-y-3`}>
              {filteredTasks.filter(t => t.status === col.id).map(task => (
                <motion.div
                  layoutId={task.id.toString()}
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 hover:border-indigo-300 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap gap-1">
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                        task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        (task.health_status || 'on_track') === 'on_track' ? 'bg-emerald-50 text-emerald-600' :
                        task.health_status === 'at_risk' ? 'bg-amber-50 text-amber-600' :
                        task.health_status === 'due' ? 'bg-indigo-50 text-indigo-600' :
                        task.health_status === 'completed' ? 'bg-blue-50 text-blue-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {(task.health_status || 'on_track').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = getNextStatus(task.status);
                          onUpdateTask(task.id, { status: nextStatus as any });
                        }}
                        className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title={`Move to ${columns.find(c => c.id === getNextStatus(task.status))?.label}`}
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(task);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 rounded-md transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 size={16} />
                      </button>
                        {user.role === 'admin' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskToDelete(task);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-1 leading-tight">{task.title}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-medium">{task.due_date || 'No date'}</span>
                      </div>
                      {(task.comments_count || 0) > 0 && (
                        <div className="flex items-center gap-1 text-indigo-500">
                          <MessageSquare size={12} />
                          <span className="text-[10px] font-bold">{task.comments_count}</span>
                        </div>
                      )}
                      {(task.attachments_count || 0) > 0 && (
                        <div className="flex items-center gap-1 text-indigo-500">
                          <Paperclip size={12} />
                          <span className="text-[10px] font-bold">{task.attachments_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-600 border-2 border-white shadow-sm">
                      {task.assignee_name?.charAt(0) || '?'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-zinc-900">Delete Task?</h3>
              <p className="text-sm text-zinc-500 mb-8">
                Are you sure you want to delete <span className="font-bold text-zinc-900">"{taskToDelete.title}"</span>? This action cannot be undone and all comments and attachments will be removed.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setIsDeleting(true);
                    const success = await onDeleteTask(taskToDelete.id);
                    setIsDeleting(false);
                    if (success) {
                      setTaskToDelete(null);
                      onSelectTask(null);
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsPanel = ({ user, useSupabase }: { user: User, useSupabase: boolean }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useSupabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id,
        currentPassword, 
        newPassword 
      })
    });

    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to update password' });
    }
  };

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Account Settings</h2>
        <p className="text-zinc-500">Manage your account preferences and security.</p>
      </header>

      {user.role === 'admin' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 mb-8">
          <h3 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <Shield size={20} className="text-indigo-600" />
            Backend Connection
          </h3>
          <div className="flex items-center gap-3 mt-4">
            <div className={`w-3 h-3 rounded-full ${useSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
            <p className="text-sm font-medium text-zinc-700">
              {useSupabase ? 'Connected to Supabase' : 'Running on Local SQLite'}
            </p>
          </div>
          {useSupabase && (
            <p className="text-xs text-zinc-500 mt-2">
              Project ID: <span className="font-mono bg-zinc-100 px-1 rounded">pzwprldgqxlcuxrsuhoi</span>
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
        <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <Lock size={20} className="text-indigo-600" />
          Change Password
        </h3>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-medium border ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          {!useSupabase && (
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Update Password
          </button>
        </form>
      </div>

      {user.role === 'admin' && (
        <div className="mt-8 bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <h3 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <Download size={20} className="text-indigo-600" />
            Export Project
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            Download the entire source code and database of this application as a ZIP file. 
            You can use this to deploy the app to your own hosting provider.
          </p>
          
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
              <AlertCircle size={14} />
              Note for Netlify: This app requires a Node.js server and SQLite database. 
              Netlify is primarily for static sites; for full-stack deployment, consider 
              platforms like Render, Railway, or Fly.io.
            </p>
          </div>

          <a 
            href="/api/download-zip" 
            download="advanced-project-management.zip"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]"
          >
            <Download size={18} />
            Download ZIP File
          </a>
        </div>
      )}
    </div>
  );
};

const AdminPanel = ({ onAddUser, users, onRefresh, onAssignTask }: { onAddUser: () => void, users: User[], onRefresh: () => void, onAssignTask: (user: User) => void }) => {
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    onRefresh();
  };

  const handleResetPassword = async () => {
    if (!resettingUser || !newPassword) return;
    await fetch(`/api/admin/users/${resettingUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    setResettingUser(null);
    setNewPassword('');
    onRefresh();
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setDeletingUser(null);
      onRefresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">User Management</h2>
          <p className="text-zinc-500">Manage system users, permissions, and account status.</p>
        </div>
        <button 
          onClick={onAddUser}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          <span className="text-sm font-medium">Add User</span>
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-bottom border-zinc-200">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      {(user.full_name || 'U').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{user.full_name || 'User'}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${
                    user.status === 'active' ? 'text-emerald-600' : 'text-zinc-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">
                  {new Date(user.created_at || Date.now()).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => onAssignTask(user)}
                      className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative"
                    >
                      <Plus size={16} />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Assign Task
                      </span>
                    </button>
                    <button 
                      onClick={() => setResettingUser(user)}
                      className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors group relative"
                    >
                      <Key size={16} />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Reset Password
                      </span>
                    </button>
                    <button 
                      onClick={() => toggleStatus(user)}
                      className={`p-2 rounded-lg transition-colors group relative ${
                        user.status === 'active' 
                          ? 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50' 
                          : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                    <button 
                      onClick={() => setDeletingUser(user)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                    >
                      <Trash2 size={16} />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Delete User
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
            >
              <h3 className="text-xl font-bold mb-2">Reset Password</h3>
              <p className="text-sm text-zinc-500 mb-6">Enter a new password for <span className="font-bold text-zinc-900">{resettingUser.full_name}</span>.</p>
              <div className="space-y-4">
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setResettingUser(null)}
                    className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleResetPassword}
                    className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete User</h3>
              <p className="text-sm text-zinc-500 mb-6">Are you sure you want to delete <span className="font-bold text-zinc-900">{deletingUser.full_name}</span>? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GanttView = ({ tasks }: { tasks: Task[] }) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const timelineTasks = tasks
    .filter(t => t.due_date)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  if (timelineTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-20">
        <GanttChart size={64} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">No tasks with deadlines found</p>
        <p className="text-sm">Add a due date to your tasks to see them in the Gantt chart.</p>
      </div>
    );
  }

  // Calculate date range for the chart
  const dates = timelineTasks.map(t => new Date(t.due_date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Add padding
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header>
        <h2 className="text-2xl font-bold text-zinc-900">Gantt Chart View</h2>
        <p className="text-zinc-500">Visual timeline of all project tasks and their deadlines.</p>
      </header>

      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <div className="min-w-[1200px] p-8">
            {/* Timeline Header */}
            <div className="flex mb-6 border-b border-zinc-100 pb-4">
              <div className="w-72 flex-shrink-0 font-bold text-xs text-zinc-400 uppercase tracking-widest">Task & Project</div>
              <div className="flex-1 relative h-6">
                <div className="absolute inset-0 flex justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                  <span>{minDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span>{maxDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Task Rows */}
            <div className="space-y-4">
              {timelineTasks.map(task => {
                const taskDate = new Date(task.due_date);
                const startOffset = Math.max(0, (taskDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                const leftPos = (startOffset / totalDays) * 100;
                const isOverdue = task.status !== 'done' && task.due_date < today;
                const isDueToday = task.status !== 'done' && task.due_date === today;

                return (
                  <div key={task.id} className="flex items-center group">
                    <div className="w-72 flex-shrink-0 pr-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider truncate">{task.project_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 relative h-10 bg-zinc-50/50 rounded-xl border border-zinc-100/50">
                      {/* Today marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-indigo-200/50 z-10"
                        style={{ left: `${((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100}%` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-indigo-400 uppercase bg-white px-1 rounded border border-indigo-100">Today</div>
                      </div>

                      {/* Task Bar */}
                      <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '16px', opacity: 1 }}
                        className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-full shadow-sm cursor-pointer z-20 group-hover:scale-y-110 transition-transform ${
                          isOverdue ? 'bg-red-500 shadow-red-100' : 
                          isDueToday ? 'bg-amber-500 shadow-amber-100' : 
                          task.status === 'done' ? 'bg-emerald-500 shadow-emerald-100' : 
                          'bg-indigo-500 shadow-indigo-100'
                        }`}
                        style={{ left: `${leftPos}%` }}
                      >
                        <div className="absolute left-full ml-3 whitespace-nowrap bg-white border border-zinc-200 px-2 py-1 rounded-lg shadow-xl text-[10px] font-bold text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                          {task.due_date} • {task.status.replace('_', ' ')}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = ({ onLogin, useSupabase }: { onLogin: (user: User) => void, useSupabase: boolean }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (useSupabase) {
        if (isSignUp) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName }
            }
          });
          if (signUpError) throw signUpError;
          
          if (data.user && !data.session) {
            setError("Check your email for a confirmation link!");
            setLoading(false);
            return;
          }

          if (data.user) {
            // Fetch profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            if (profile) onLogin(profile);
            else onLogin({ id: data.user.id, email: data.user.email!, full_name: fullName, role: 'user', status: 'active' });
          }
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            if (signInError.message === 'Invalid login credentials') {
              throw new Error('Invalid email or password. Note: Old accounts from the local database do not work with Supabase. Please sign up again.');
            }
            throw signInError;
          }
          if (data.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
            if (profile) onLogin(profile);
            else onLogin({ id: data.user.id, email: data.user.email!, full_name: 'User', role: 'user', status: 'active' });
          }
        }
      } else {
        if (isSignUp) {
          const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName })
          });
          const data = await res.json();
          if (res.ok) {
            onLogin(data);
          } else {
            setError(data.error);
          }
        } else {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (res.ok) {
            onLogin(data);
          } else {
            setError(data.error);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-200">
          <div className="text-center mb-8">
            <Logo className="w-20 h-20 mx-auto mb-4 text-xl" />
            <h1 className="text-2xl font-bold text-zinc-900">
              {isSignUp ? 'Create Account' : 'Welcome to Advanced Project Management'}
            </h1>
            <p className="text-zinc-500 mt-2">
              {useSupabase ? 'Powered by Supabase' : 'Advanced Project Management'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            
            {isSignUp && (
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamPanel = ({ users, onAssignTask }: { users: User[], onAssignTask: (user: User) => void }) => {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-zinc-900">Team Directory</h2>
        <p className="text-zinc-500">View and connect with your team members.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                {(u.full_name || 'U').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">{u.full_name || 'User'}</p>
                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {u.role}
                </span>
              </div>
            </div>
            <button 
              onClick={() => onAssignTask(u)}
              className="w-full py-2 bg-zinc-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Assign Task
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [useSupabase, setUseSupabase] = useState(!!(import.meta as any).env.VITE_SUPABASE_URL && !!(import.meta as any).env.VITE_SUPABASE_ANON_KEY);

  // Form states for new project
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectDesc(project.description);
    setIsProjectModalOpen(true);
  };

  // Form states for new task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | string | null>(null);
  const [newTaskProject, setNewTaskProject] = useState<number | string>(0);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Form states for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  useEffect(() => {
    if (useSupabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
            if (profile) setUser(profile);
            else if (session.user) setUser({ id: session.user.id, email: session.user.email!, full_name: 'User', role: 'user', status: 'active' });
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
            if (profile) setUser(profile);
            else if (session.user) setUser({ id: session.user.id, email: session.user.email!, full_name: 'User', role: 'user', status: 'active' });
          });
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [useSupabase]);

  const fetchData = async () => {
    if (useSupabase) {
      try {
        const [pRes, tRes, uRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*, profiles(full_name), projects(name), comments(count), attachments(count)'),
          supabase.from('profiles').select('*')
        ]);

        if (pRes.data) setProjects(pRes.data);
        if (tRes.data) {
          const formattedTasks = tRes.data.map((t: any) => ({
            ...t,
            assignee_name: t.profiles?.full_name,
            project_name: t.projects?.name,
            comments_count: t.comments?.[0]?.count || 0,
            attachments_count: t.attachments?.[0]?.count || 0
          }));
          setTasks(formattedTasks);
        }
        if (uRes.data) setUsers(uRes.data);

        if (pRes.data && pRes.data.length > 0 && !selectedProject) {
          setSelectedProject(pRes.data[0]);
        }
      } catch (error) {
        console.error("Supabase fetch failed", error);
      }
      return;
    }

    try {
      const [pRes, tRes, uRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/tasks'),
        fetch('/api/admin/users')
      ]);
      
      if (!pRes.ok || !tRes.ok || !uRes.ok) {
        console.error("One or more API requests failed");
        return;
      }

      const pData = await pRes.json();
      const tData = await tRes.json();
      const uData = await uRes.json();
      
      if (Array.isArray(pData)) setProjects(pData);
      if (Array.isArray(tData)) setTasks(tData);
      if (Array.isArray(uData)) setUsers(uData);
      
      if (Array.isArray(pData) && pData.length > 0 && !selectedProject) {
        setSelectedProject(pData[0]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
      
      // Due date notification check
      const checkDeadlines = () => {
        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
        
        tasks.forEach(t => {
          if (t.status !== 'done' && t.due_date) {
            const dueDate = new Date(t.due_date);
            if (dueDate <= twoDaysFromNow && dueDate >= now) {
              // Simple browser notification/alert for demo
              // In a real app, this would be a toast or a dedicated notification UI
              const key = `notified_${t.id}`;
              if (!localStorage.getItem(key)) {
                alert(`⚠️ Task approaching deadline: "${t.title}" is due on ${t.due_date}`);
                localStorage.setItem(key, 'true');
              }
            }
          }
        });
      };

      const interval = setInterval(checkDeadlines, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user, tasks]);

  const handleUpdateTask = async (id: number | string, updates: Partial<Task>) => {
    try {
      // Sanitize assignee_id for Supabase/PostgreSQL UUID compatibility
      const sanitizedUpdates = { ...updates };
      
      // If using Supabase, ensure assignee_id is either a valid UUID or null
      // Numeric IDs like "9" or "0" will be converted to null
      if (useSupabase && sanitizedUpdates.assignee_id !== undefined) {
        const val = sanitizedUpdates.assignee_id;
        const isUuid = typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        if (!isUuid && val !== null) {
          sanitizedUpdates.assignee_id = null;
        }
      } else if (sanitizedUpdates.assignee_id === 0 || sanitizedUpdates.assignee_id === '0') {
        sanitizedUpdates.assignee_id = null;
      }

      if (useSupabase) {
        const { error: taskError } = await supabase.from('tasks').update(sanitizedUpdates).eq('id', id);
        if (taskError) {
          console.error("Task update error:", taskError);
          alert(`Failed to update task: ${taskError.message}`);
          throw taskError;
        }
        fetchData();
        return;
      }

      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedUpdates)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectId = newTaskProject || selectedProject?.id;
    if (!projectId) {
      alert("Please select a project.");
      return;
    }

    try {
      if (useSupabase) {
        let assigneeId = newTaskAssignee && newTaskAssignee !== '0' && newTaskAssignee !== 0 ? newTaskAssignee : null;
        
        // Ensure assigneeId is a valid UUID if using Supabase
        if (assigneeId) {
          const isUuid = typeof assigneeId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assigneeId);
          if (!isUuid) assigneeId = null;
        }

        const { error: taskError } = await supabase.from('tasks').insert({
          project_id: projectId,
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
          status: 'todo',
          assignee_id: assigneeId,
          due_date: newTaskDueDate,
          health_status: 'on_track'
        });
        if (taskError) {
          console.error("Task creation error:", taskError);
          alert(`Failed to create task: ${taskError.message}`);
          throw taskError;
        }
        setIsTaskModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskAssignee(null);
        setNewTaskProject(0);
        setNewTaskPriority('medium');
        await fetchData();
        return;
      }

      const assigneeId = newTaskAssignee && newTaskAssignee !== '0' && newTaskAssignee !== 0 ? newTaskAssignee : null;
      
      const payload = {
        project_id: projectId,
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        status: 'todo',
        assignee_id: assigneeId,
        due_date: newTaskDueDate,
        health_status: 'on_track'
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsTaskModalOpen(false);
        // Reset form
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskAssignee(null);
        setNewTaskProject(0);
        setNewTaskPriority('medium');
        
        await fetchData();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'Failed to create task'}`);
      }
    } catch (error) {
      console.error("Failed to add task", error);
      alert("A network error occurred. Please try again.");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    
    try {
      if (useSupabase) {
        if (editingProject) {
          const { error: projectError } = await supabase.from('projects').update({
            name: newProjectName,
            description: newProjectDesc
          }).eq('id', editingProject.id);
          if (projectError) throw projectError;
        } else {
          const { error: projectError } = await supabase.from('projects').insert({
            name: newProjectName,
            description: newProjectDesc,
            owner_id: user?.id
          });
          if (projectError) {
            console.error("Project creation error:", projectError);
            alert(`Failed to create project: ${projectError.message}`);
            throw projectError;
          }
        }
        setIsProjectModalOpen(false);
        setEditingProject(null);
        setNewProjectName('');
        setNewProjectDesc('');
        await fetchData();
        return;
      }

      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newProjectName, 
          description: newProjectDesc, 
          owner_id: user?.id 
        })
      });
      if (res.ok) {
        setIsProjectModalOpen(false);
        setEditingProject(null);
        setNewProjectName('');
        setNewProjectDesc('');
        await fetchData();
      } else {
        const error = await res.json();
        alert(error.error || `Failed to ${editingProject ? 'update' : 'create'} project`);
      }
    } catch (error) {
      console.error(`Failed to ${editingProject ? 'update' : 'create'} project`, error);
      alert("A network error occurred. Please try again.");
    }
  };

  const handleDeleteProject = async (id: number | string) => {
    try {
      if (useSupabase) {
        const { error: projectError } = await supabase.from('projects').delete().eq('id', id);
        if (projectError) throw projectError;
        setSelectedProject(null);
        await fetchData();
        return;
      }

      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedProject(null);
        await fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("A network error occurred while deleting the project.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useSupabase) {
      alert("In Supabase mode, users should sign up via the login page or be managed through the Supabase dashboard. Local user creation is disabled.");
      setIsUserModalOpen(false);
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          full_name: newUserFullName,
          password: newUserPassword,
          role: newUserRole
        })
      });
      if (res.ok) {
        setIsUserModalOpen(false);
        setNewUserEmail('');
        setNewUserFullName('');
        setNewUserPassword('');
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add user", error);
    }
  };

  const handleDeleteTask = async (id: number | string) => {
    try {
      if (useSupabase) {
        const { error: taskError } = await supabase.from('tasks').delete().eq('id', id);
        if (taskError) throw taskError;
        await fetchData();
        return true;
      }

      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
        return true;
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete task");
        return false;
      }
    } catch (error) {
      console.error("Failed to delete task", error);
      alert("A network error occurred while deleting the task.");
      return false;
    }
  };

  if (!user) {
    return <Login onLogin={setUser} useSupabase={useSupabase} />;
  }

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={async () => {
          if (useSupabase) await supabase.auth.signOut();
          setUser(null);
        }} 
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        onAddProject={() => setIsProjectModalOpen(true)}
      />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard projects={projects} tasks={tasks} onSelectTask={setSelectedTask} />}
              {activeTab === 'projects' && (
                selectedProject ? (
                  <ProjectBoard 
                    project={selectedProject} 
                    tasks={Array.isArray(tasks) ? tasks.filter(t => t.project_id === selectedProject.id) : []} 
                    users={users}
                    user={user}
                    onUpdateTask={handleUpdateTask}
                    onAddTask={() => {
                      setNewTaskProject(selectedProject.id);
                      setIsTaskModalOpen(true);
                    }}
                    onDeleteTask={handleDeleteTask}
                    onDeleteProject={handleDeleteProject}
                    onEditProject={handleEditProject}
                    selectedTask={selectedTask}
                    onSelectTask={setSelectedTask}
                  />
                ) : (
                  <div className="text-center py-20">
                    <Layout size={48} className="mx-auto text-zinc-300 mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900">No Projects Found</h2>
                    <p className="text-zinc-500 mb-6">Create your first project to get started.</p>
                    {user.role === 'admin' && (
                      <button 
                        onClick={() => setIsProjectModalOpen(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                      >
                        Create Project
                      </button>
                    )}
                  </div>
                )
              )}
              {activeTab === 'gantt' && <GanttView tasks={tasks} />}
              {activeTab === 'team' && <TeamPanel users={users} onAssignTask={(u) => {
                setNewTaskAssignee(u.id);
                setIsTaskModalOpen(true);
              }} />}
              {activeTab === 'admin' && user.role === 'admin' && (
                <AdminPanel 
                  onAddUser={() => setIsUserModalOpen(true)} 
                  users={users}
                  onRefresh={fetchData}
                  onAssignTask={(u) => {
                    setNewTaskAssignee(u.id);
                    setIsTaskModalOpen(true);
                  }}
                />
              )}
              {activeTab === 'settings' && <SettingsPanel user={user} useSupabase={useSupabase} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            user={user}
            users={users}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdateTask}
            onDelete={async (id) => {
              if (confirm("Are you sure you want to delete this task?")) {
                await handleDeleteTask(id);
                setSelectedTask(null);
              }
              return true;
            }}
            useSupabase={useSupabase}
            onRefresh={fetchData}
          />
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8"
          >
            <h3 className="text-xl font-bold mb-6">Create New Task</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Project</label>
                <select 
                  value={newTaskProject || selectedProject?.id || 0}
                  onChange={(e) => setNewTaskProject(isNaN(parseInt(e.target.value)) ? e.target.value : parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value={0} disabled>Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                <textarea 
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Assignee</label>
                <select 
                  value={newTaskAssignee || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTaskAssignee(val === "" ? null : val);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Priority</label>
                <select 
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8"
          >
            <h3 className="text-xl font-bold mb-6">{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                <textarea 
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  placeholder="Optional project description..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsProjectModalOpen(false);
                    setEditingProject(null);
                    setNewProjectName('');
                    setNewProjectDesc('');
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8"
          >
            <h3 className="text-xl font-bold mb-6">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Initial Password</label>
                <input 
                  type="password" 
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Role</label>
                <select 
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
