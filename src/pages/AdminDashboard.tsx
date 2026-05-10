import * as React from "react";
import { useState, useEffect } from "react";
import { Users, AlertTriangle, Shield, CheckCircle2, Ticket, XCircle, Search, Edit, Trash2, Activity, Plus, TrendingUp, Star, Clock, AlertCircle, FileText, Ban, Settings, LogOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import type { TicketReport } from "@/src/types";
import { signOut } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase/firebase";
import {
  getTickets,
  TICKETS_ADMIN_QUERY_LIMIT,
  updateTicketStatus,
  updateTicket,
  deleteTicket,
} from "@/src/lib/firebase/tickets";
import { enqueueSellerAdminTicketNotification } from "@/src/lib/firebase/sellerTicketNotifications";
import { getAllUsers, deleteUserData } from "@/src/lib/firebase/users";
import { getAdminNotes, getAdminLogs, addAdminLog, saveAdminNotes } from "@/src/lib/firebase/adminSettings";
import { ANONYMOUS_REPORTER_ID, getTicketReports } from "@/src/lib/firebase/ticketReports";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const AVAILABLE_PERMISSIONS = [
  { id: "manage_users", label: "Manage users", category: "User Management" },
  { id: "view_users", label: "View users", category: "User Management" },
  { id: "delete_users", label: "Delete users", category: "User Management" },
  { id: "suspend_users", label: "Suspend users", category: "User Management" },
  { id: "manage_tickets", label: "Manage ticket listings", category: "Ticket Management" },
  { id: "delete_tickets", label: "Delete ticket listings", category: "Ticket Management" },
  { id: "edit_tickets", label: "Edit ticket listings", category: "Ticket Management" },
  { id: "mark_sold", label: "Mark tickets as sold", category: "Ticket Management" },
  { id: "view_analytics", label: "View analytics", category: "Analytics" },
  { id: "access_dashboard", label: "Access dashboard analytics", category: "Analytics" },
  { id: "view_whatsapp_logs", label: "View WhatsApp request logs", category: "Analytics" },
  { id: "manage_reports", label: "Manage reports", category: "Moderation" },
  { id: "view_admin_logs", label: "View admin logs", category: "Moderation" },
  { id: "manage_notifications", label: "Manage notifications", category: "Moderation" },
  { id: "access_settings", label: "Access settings", category: "Admin Controls" },
  { id: "add_admins", label: "Add new admins", category: "Admin Controls" },
  { id: "remove_admins", label: "Remove admins", category: "Admin Controls" },
  { id: "change_roles", label: "Change admin roles", category: "Admin Controls" },
  { id: "manage_homepage", label: "Manage platform homepage content", category: "Admin Controls" },
];

const PRESETS = {
  "Super Admin": AVAILABLE_PERMISSIONS.map(p => p.id),
  "Moderator": ["view_users", "edit_tickets", "delete_tickets", "manage_reports", "view_admin_logs"],
  "Support Agent": ["view_users", "mark_sold", "manage_notifications"]
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [adminRole, setAdminRole] = useState("Super Admin"); // Super Admin, Moderator, Support Agent
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminsList, setAdminsList] = useState<
    { id: string; name: string; email: string; role: string; permissions: string[]; isSelf: boolean }[]
  >([]);
  const [ticketReports, setTicketReports] = useState<TicketReport[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    getTickets({ maxResults: TICKETS_ADMIN_QUERY_LIMIT }).then((t) => setTickets(t));
    getAllUsers().then((u) => setUsers(u));
    getAdminNotes().then((notes) => setAdminNotes(notes ?? ""));
    getAdminLogs().then((loadedLogs) => setLogs(loadedLogs));

    getDocs(query(collection(db, "admins"), where("role", "==", "admin")))
      .then((snapshot) => {
        setAdminsList(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name ?? ""),
              email: String(data.email ?? ""),
              role: "Administrator",
              permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
              isSelf: d.id === currentUser?.id,
            };
          }),
        );
      })
      .catch((err) => console.error("Failed to load admins", err));

    getTicketReports()
      .then(setTicketReports)
      .catch(() => setTicketReports([]));
  }, [currentUser]);

  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<keyof typeof PRESETS>("Moderator");

  const handleAddAdmin = () => {
    toast.info("New admins register at /admin/register; approve pending requests below.");
  };

  const handleRemoveAdmin = (_adminId: string) => {
    toast.info("Removing admins is not available here; manage accounts in Firebase Console if needed.");
  };

  // Ticket Filters
  const [searchTicket, setSearchTicket] = useState("");
  const [filterTicketStatus, setFilterTicketStatus] = useState("all");

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditTicket, setCurrentEditTicket] = useState<any>(null);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    
    const fetchPendingAdmins = async () => {
      try {
        const q = query(collection(db, "admins"), where("role", "==", "pending_admin"));
        const snapshot = await getDocs(q);
        const approvals: any[] = [];
        snapshot.forEach((docSnap) => {
          approvals.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPendingAdmins(approvals);
      } catch (err: unknown) {
        console.error("Failed to fetch pending admins", err);
      }
    };
    fetchPendingAdmins();
  }, [currentUser]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-mono uppercase font-bold tracking-widest text-muted-foreground">Verifying access...</div>;
  }

  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  const handleApproveAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, "admins", userId), { role: "admin" });
      setPendingAdmins(pendingAdmins.filter(a => a.id !== userId));
      toast.success("Administrator approved successfully.");
    } catch (err: any) {
      toast.error("Failed to approve administrator: " + err.message);
    }
  };

  const handleRejectAdmin = async (userId: string) => {
    try {
      // Import deleteDoc from firebase/firestore if not already present or simply use updateDoc
      await updateDoc(doc(db, "admins", userId), { role: "rejected" }); 
      setPendingAdmins(pendingAdmins.filter(a => a.id !== userId));
      toast.success("Administrator request rejected.");
    } catch (err: any) {
      toast.error("Failed to reject administrator: " + err.message);
    }
  };

  const handleTogglePermission = (adminId: string, permissionId: string) => {
    setAdminsList(adminsList.map(admin => {
      if (admin.id === adminId) {
        let newPerms;
        if (admin.permissions.includes(permissionId)) {
          newPerms = admin.permissions.filter(p => p !== permissionId);
        } else {
          newPerms = [...admin.permissions, permissionId];
        }
        return { ...admin, permissions: newPerms };
      }
      return admin;
    }));
    toast.success("Permissions updated");
  };

  const handleSelectPreset = (adminId: string, roleName: keyof typeof PRESETS) => {
    setAdminsList(adminsList.map(admin => {
      if (admin.id === adminId) {
        return { ...admin, role: roleName, permissions: [...PRESETS[roleName]] };
      }
      return admin;
    }));
    toast.success(`Role updated to ${roleName}`);
  };

  const addLog = (action: string, details: string) => {
    const newLog = { id: String(Date.now()), action, details, time: "Just now", createdAt: new Date() };
    setLogs([newLog, ...logs]);
    void addAdminLog(action, details);
  };

  const handleToggleSold = (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const newStatus = ticket.status === 'sold' ? 'active' : 'sold';
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    void updateTicketStatus(id, newStatus as "available" | "sold" | "pending").then(() => {
      addLog("Ticket Status Toggle", `Toggled sold status for ${id} to ${newStatus}`);
      toast.success("Ticket status updated to " + newStatus);
      enqueueSellerAdminTicketNotification({
        sellerUserId: ticket.sellerId,
        ticketId: ticket.id,
        transportName: ticket.transportName ?? ticket.id,
        kind: "status",
        statusLabel: newStatus,
      });
    });
  };

  const handleToggleUrgentFeatured = (id: string, type: 'urgent' | 'featured') => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const newValue = !ticket[type];
    setTickets(tickets.map(t => t.id === id ? { ...t, [type]: newValue } : t));
    
    void updateTicket(id, { [type]: newValue } as Parameters<typeof updateTicket>[1]).then(() => {
      addLog("Ticket Promoted", `Toggled ${type} for ${id}`);
      toast.success("Ticket highlight updated");
    });
  };

  const handleActionClick = (actionName: string) => {
    if (adminRole === "Support Agent" && ["Ban User", "Delete Ticket"].includes(actionName)) {
      toast.error("Permission Denied", { description: "Support Agents cannot perform this action." });
      return false;
    }
    return true;
  };

  const handleDeleteTicket = (id: string) => {
    if (!handleActionClick("Delete Ticket")) return;
    const removed = tickets.find((t) => t.id === id);
    setTickets(tickets.filter(t => t.id !== id));
    
    void deleteTicket(id).then(() => {
      addLog("Ticket Removed", `Removed listing ${id}`);
      toast.success("Ticket removed successfully");
      if (removed?.sellerId) {
        enqueueSellerAdminTicketNotification({
          sellerUserId: removed.sellerId,
          ticketId: removed.id,
          transportName: removed.transportName ?? removed.id,
          kind: "deleted",
        });
      }
    });
  };

  const handleApproveFlagged = (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    setTickets(tickets.map(t => t.id === id ? { ...t, status: 'active' } : t));
    void updateTicketStatus(id, "available").then(() => {
      addLog("Ticket Approved", `Approved flagged ticket ${id}`);
      toast.success("Ticket approved on marketplace");
      if (ticket?.sellerId) {
        enqueueSellerAdminTicketNotification({
          sellerUserId: ticket.sellerId,
          ticketId: ticket.id,
          transportName: ticket.transportName ?? ticket.id,
          kind: "status",
          statusLabel: "available",
        });
      }
    });
  };

  const handleToggleUserStatus = (id: string, newStatus: string) => {
    if (!handleActionClick("Ban User") && newStatus === 'banned') return;
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    addLog("User Status Updated", `User ${id} is now ${newStatus}`);
    toast.success(`User marked as ${newStatus}`);
  };

  const handleHardDeleteUser = async (id: string) => {
    if (window.confirm("WARNING: This will permanently delete the user's profile, tickets, notifications, and all associated data. This action cannot be undone. \n\nNote: For complete deletion, Firebase Authentication records may need to be deleted separately in the Firebase Console.\n\nAre you sure you want to proceed?")) {
      void deleteUserData(id)
        .then(() => {
          setUsers(users.filter((u) => u.id !== id));
          addLog("User Hard Deleted", `User ${id} and all their data was permanently deleted`);
          toast.success("User data successfully deleted");
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to delete user data");
        });
    }
  };

  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    if (currentEditTicket) {
      const edited = currentEditTicket;
      const updatedData = {
        transportName: formData.get('transportName') as string,
        sellingPrice: Number(formData.get('sellingPrice')),
        status: formData.get('status') as string,
      };

      setTickets(tickets.map(t => t.id === edited.id ? { 
        ...t, 
        ...updatedData
      } : t));
      
      void updateTicket(edited.id, updatedData as Parameters<typeof updateTicket>[1])
        .then(() => {
          addLog("Ticket Edited", `Admin edited ticket ${edited.id}`);
          setIsEditModalOpen(false);
          setCurrentEditTicket(null);
          toast.success("Ticket details updated");
          if (edited.sellerId) {
            enqueueSellerAdminTicketNotification({
              sellerUserId: edited.sellerId,
              ticketId: edited.id,
              transportName: edited.transportName ?? edited.id,
              kind: "edited",
            });
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to update ticket.");
        });
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchTicket.toLowerCase();
    const sellerLabel = (t.sellerName ?? "").toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.transportName.toLowerCase().includes(q) ||
      sellerLabel.includes(q);
    const matchesStatus = filterTicketStatus === "all" || t.status === filterTicketStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-destructive p-3 border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <Shield className="w-8 h-8 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tighter uppercase leading-none">Admin Command</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-2">System overview & moderation</p>
            </div>
          </div>
          <Button
            onClick={() => void signOut(auth).then(() => navigate("/", { replace: true }))}
            variant="outline"
            className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all flex items-center font-mono text-xs uppercase font-bold tracking-widest h-12"
          >
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="bg-muted p-2 rounded-none border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] h-auto overflow-x-auto justify-start w-full gap-2 relative">
            <TabsTrigger value="overview" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Analytics & Overview
            </TabsTrigger>
            <TabsTrigger value="tickets" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Manage Tickets
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Manage Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Scam & Reports
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Audit Logs
            </TabsTrigger>
            {adminRole === "Super Admin" && (
              <TabsTrigger value="admins" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold text-destructive">
                Admins & Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Total Listings</h3>
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter">{tickets.length}</div>
                <p className="font-mono text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Active tickets</p>
              </div>
              <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Active Users</h3>
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter">{users.length}</div>
                <p className="font-mono text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Registered users</p>
              </div>
              <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Tickets Sold</h3>
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter">{tickets.filter(t => t.status === "sold").length}</div>
                <p className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Lifetime</p>
              </div>
              <div className="bg-destructive border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40 transform rotate-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-destructive-foreground">Pending Items</h3>
                  <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter text-destructive-foreground">{tickets.filter(t => t.status === "pending").length}</div>
                <p className="font-mono text-[10px] text-red-200 font-bold uppercase tracking-widest">Needs action</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Daily/Weekly Stats */}
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 lg:col-span-2">
                <h3 className="font-heading text-2xl font-black uppercase tracking-tighter mb-6 border-b-4 border-foreground pb-4 flex justify-between items-center">
                  Recent Ticket Posts <Badge className="rounded-none bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-[10px] tracking-widest font-black uppercase">Live Updates</Badge>
                </h3>
                <div className="space-y-4">
                  {tickets.slice(0, 3).map(ticket => (
                    <div key={ticket.id} className="flex justify-between items-center border-l-4 border-primary p-3 bg-muted/20">
                      <div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-widest">{ticket.id} • {ticket.postedAt && typeof ticket.postedAt === 'object' ? new Date((ticket.postedAt as any).seconds * 1000).toLocaleDateString() : ticket.postedAt}</p>
                        <p className="font-heading font-bold text-lg uppercase leading-none mt-1">{ticket.transportName}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-1">{ticket.from} → {ticket.to}</p>
                      </div>
                      <div className="text-right">
                         <p className="font-heading text-xl font-black tracking-tighter text-emerald-600">৳{ticket.sellingPrice}</p>
                         <p className="font-mono text-[10px] font-bold text-muted-foreground">Seller: {ticket.sellerName ?? ticket.sellerId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Most Searched */}
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                <h3 className="font-heading text-xl font-black uppercase tracking-tighter mb-4 border-b-4 border-foreground pb-2">Top Destinations</h3>
                <div className="space-y-4 font-mono uppercase text-xs font-bold">
                  {Object.entries(tickets.reduce((acc, t) => ({...acc, [t.to]: (acc[t.to] || 0) + 1}), {} as Record<string, number>))
                    .sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 4).map(([name, count], i, arr) => (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between">
                         <span>{i+1}. {name}</span>
                         <span>{count} listings</span>
                      </div>
                      <div className="w-full bg-muted h-2 border border-foreground shadow-[1px_1px_0_0_rgba(0,0,0,1)]">
                         <div className="bg-primary h-full border-r border-foreground" style={{width: `${(Number(count) / Number(arr[0][1])) * 100}%`}}></div>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && <p className="text-muted-foreground">No destinations data yet.</p>}
                </div>
              </div>

              {/* Recent Buyer Requests */}
               <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                 <h3 className="font-heading text-xl font-black uppercase tracking-tighter mb-4 border-b-4 border-foreground pb-2">Recent Buyer Requests</h3>
                 <div className="space-y-4">
                   <p className="font-mono text-xs font-bold text-muted-foreground">Buyer requests tracking not implemented yet.</p>
                 </div>
               </div>

              {/* Admin Notes */}
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 lg:col-span-3">
                 <h3 className="font-heading text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2"><FileText className="w-5 h-5"/> Admin Notes System</h3>
                 <Textarea 
                   value={adminNotes} 
                   onChange={(e) => setAdminNotes(e.target.value)}
                   className="min-h-[100px] border-2 border-foreground rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold p-4 bg-muted/20 resize-none focus-visible:ring-0"
                 />
                 <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        void saveAdminNotes(adminNotes).then(() => {
                          toast.success("Notes saved");
                        });
                      }}
                      className="rounded-none font-mono text-[10px] font-black uppercase tracking-widest border-2 border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                    >
                      Save Notes
                    </Button>
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 flex flex-col min-h-[600px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-foreground text-background px-3 py-1 border-2 border-foreground inline-block">Manage Tickets</h3>
                
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Filter by Name/ID/Route..." value={searchTicket} onChange={(e) => setSearchTicket(e.target.value)} className="pl-9 h-10 rounded-none border-2 border-foreground font-mono text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-background" />
                  </div>
                  <Select value={filterTicketStatus} onValueChange={setFilterTicketStatus}>
                    <SelectTrigger className="w-[140px] rounded-none border-2 border-foreground font-mono text-xs uppercase font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-background">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-foreground">
                      <SelectItem value="all" className="font-mono text-xs uppercase">All</SelectItem>
                      <SelectItem value="available" className="font-mono text-xs uppercase">Available</SelectItem>
                      <SelectItem value="flagged" className="font-mono text-xs uppercase">Flagged</SelectItem>
                      <SelectItem value="sold" className="font-mono text-xs uppercase">Sold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 border-t border-b border-muted">
                <table className="w-full text-left font-mono text-[10px] xl:text-xs">
                  <thead className="bg-foreground text-background uppercase tracking-widest font-black border-y-2 border-foreground">
                    <tr>
                      <th className="p-3 border-r-2 border-foreground">Ticket & Route</th>
                      <th className="p-3 border-r-2 border-foreground">Price</th>
                      <th className="p-3 border-r-2 border-foreground">User Details</th>
                      <th className="p-3 border-r-2 border-foreground">Features & Expiry</th>
                      <th className="p-3 border-r-2 border-foreground">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, i) => {
                      const user = users.find(u => u.id === ticket.sellerId);
                      return (
                      <tr key={ticket.id} className={`border-b-2 border-foreground ${i % 2 === 0 ? "bg-muted/10" : "bg-background"} hover:bg-muted/50 transition-colors`}>
                        <td className="p-3 border-r-2 border-foreground">
                          <p className="font-heading font-bold text-sm xl:text-base uppercase">{ticket.transportName}</p>
                          <p className="text-muted-foreground">{ticket.from} → {ticket.to} | {ticket.id}</p>
                        </td>
                        <td className="p-3 font-bold border-r-2 border-foreground text-emerald-600 text-sm">৳{ticket.sellingPrice}</td>
                        <td className="p-3 border-r-2 border-foreground">
                          <p className="font-bold">{ticket.sellerName || user?.name || "Unknown User"} <span className="text-muted-foreground font-normal">({user?.role || "user"})</span></p>
                          <p className="text-muted-foreground">{user?.email || ticket.sellerId}</p>
                          {ticket.sellerPhone && <p className="text-muted-foreground mt-1 text-[10px]">📞 {ticket.sellerPhone}</p>}
                        </td>
                        <td className="p-3 border-r-2 border-foreground">
                           <div className="flex flex-wrap gap-1 mb-1">
                             <Button onClick={() => handleToggleUrgentFeatured(ticket.id, 'featured')} size="sm" variant="outline" className={`h-6 px-2 text-[8px] rounded-none border-foreground font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${ticket.featured ? 'bg-amber-400 text-amber-950' : 'bg-background'}`}>Featured</Button>
                             <Button onClick={() => handleToggleUrgentFeatured(ticket.id, 'urgent')} size="sm" variant="outline" className={`h-6 px-2 text-[8px] rounded-none border-foreground font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${ticket.urgent ? 'bg-red-400 text-red-950' : 'bg-background'}`}>Urgent</Button>
                           </div>
                           <p className="text-muted-foreground mb-1">Exp: {ticket.date} {ticket.departureTime}</p>
                           <p className="text-muted-foreground font-mono text-[10px] font-bold">👁️ {ticket.views || 0} Views</p>
                        </td>
                        <td className="p-3 border-r-2 border-foreground">
                          <Badge className={`rounded-none border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                            ticket.status === 'sold' ? 'bg-muted text-muted-foreground' :
                            ticket.status === 'expired' || new Date() > new Date(`${ticket.date}T${ticket.departureTime || '00:00'}`) ? 'bg-red-900 text-red-100' :
                            ticket.status === 'active' || ticket.status === 'available' ? 'bg-emerald-400 text-emerald-950' : 
                            ticket.status === 'flagged' ? 'bg-destructive text-destructive-foreground' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {ticket.status === 'sold' ? 'Sold' : ticket.status === 'expired' || new Date() > new Date(`${ticket.date}T${ticket.departureTime || '00:00'}`) ? 'Expired' : ticket.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                             <Button onClick={() => { setCurrentEditTicket(ticket); setIsEditModalOpen(true); }} size="sm" variant="outline" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-blue-500 hover:text-white uppercase font-bold text-[8px]">
                                Edit
                             </Button>
                             <Button onClick={() => handleToggleSold(ticket.id)} size="sm" variant="outline" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-emerald-500 hover:text-white uppercase font-bold text-[8px]">
                                Mark Sold
                             </Button>
                             {ticket.status === 'flagged' && (
                               <Button onClick={() => handleApproveFlagged(ticket.id)} size="sm" variant="outline" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-emerald-500 hover:text-white uppercase font-bold text-[8px]">
                                  Approve
                               </Button>
                             )}
                             <Button onClick={() => handleDeleteTicket(ticket.id)} size="sm" variant="destructive" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-red-700 uppercase font-bold text-[8px]">
                                Remove
                             </Button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 flex flex-col min-h-[600px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-foreground text-background px-3 py-1 border-2 border-foreground inline-block">User Management</h3>
              </div>

               <div className="overflow-x-auto flex-1">
                <table className="w-full text-left font-mono text-[10px] xl:text-xs">
                  <thead className="bg-foreground text-background uppercase tracking-widest font-black border-2 border-foreground">
                    <tr>
                      <th className="p-3 border-r-2 border-foreground">User ID</th>
                      <th className="p-3 border-r-2 border-foreground">Name & Contact</th>
                      <th className="p-3 border-r-2 border-foreground">Performance</th>
                      <th className="p-3 border-r-2 border-foreground">Status / Role</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} className={`border-2 border-t-0 border-foreground ${i % 2 === 0 ? "bg-muted/10" : "bg-background"} hover:bg-muted/50 transition-colors`}>
                        <td className="p-3 font-bold border-r-2 border-foreground">
                           <p>{user.id}</p>
                           <p className="text-[9px] text-muted-foreground font-normal">Joined: {user.joinedAt}</p>
                        </td>
                        <td className="p-3 border-r-2 border-foreground">
                          <p className="font-heading font-bold text-sm uppercase">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{user.email}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{user.phone}</p>
                        </td>
                        <td className="p-3 font-bold border-r-2 border-foreground">
                           <p>Posts: <span className="text-foreground">{user.ticketsPosted || 0}</span></p>
                           <p>Active Layout: <span className="text-foreground">{user.performance?.active || 0}</span></p>
                           <p>Sold Tickets: <span className="text-foreground">{user.performance?.sold || 0}</span></p>
                        </td>
                        <td className="p-3 border-r-2 border-foreground">
                           <Badge className={`rounded-none border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                            user.status === 'active' ? 'bg-emerald-400 text-emerald-950' : 
                            user.status === 'warned' ? 'bg-amber-400 text-amber-950' : 'bg-destructive text-destructive-foreground'
                          }`}>
                            {user.status}
                          </Badge>
                          <p className="mt-1 font-bold text-muted-foreground uppercase">{user.role}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                             {(user.phone) && (
                               <Button onClick={() => window.open(`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`, '_blank')} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-emerald-600" title="WhatsApp Contact">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                               </Button>
                             )}
                             <Button onClick={() => handleToggleUserStatus(user.id, 'suspended')} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-amber-600" title="Suspend User">
                                <AlertCircle className="w-4 h-4" />
                             </Button>
                             <Button onClick={() => handleToggleUserStatus(user.id, 'banned')} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-destructive" title="Ban User">
                                <Ban className="w-4 h-4" />
                             </Button>
                             <Button onClick={() => handleHardDeleteUser(user.id)} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-destructive bg-destructive/10 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Hard Delete User">
                                <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
               <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-destructive text-destructive-foreground px-3 py-1 border-2 border-foreground inline-block mb-8">Scam Reporting System</h3>
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 {ticketReports.map((report) => (
                   <div key={report.id} className="border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 bg-red-50 relative overflow-hidden flex flex-col justify-between">
                     <div className="absolute top-0 right-0 p-4">
                       <AlertCircle className="w-12 h-12 text-red-200" />
                     </div>
                     <div>
                       <h4 className="font-heading font-black text-xl uppercase mb-4 relative z-10">Report #{report.id.slice(0, 8)}</h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                           <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Target Ticket</p>
                           <p className="font-mono text-xs font-bold leading-tight">
                             <Link to={`/ticket/${report.ticketId}`} className="text-primary hover:underline">{report.ticketName} ({report.ticketId})</Link>
                           </p>
                         </div>
                         <div>
                           <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold">User Info</p>
                           <p className="font-mono text-xs font-bold leading-tight text-destructive">
                             {report.sellerName} ({report.sellerId})
                           </p>
                           <p className="font-mono text-[10px] mt-1">{report.sellerPhone}</p>
                         </div>
                       </div>

                       <div className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
                         Reporter:{" "}
                         <span className="text-foreground font-mono normal-case tracking-normal">
                           {report.reporterId === ANONYMOUS_REPORTER_ID
                             ? "Guest (not signed in)"
                             : report.reporterId}
                         </span>
                       </div>

                       <div className="font-mono text-xs mb-4 p-3 bg-white border border-foreground">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Reason:</p>
                         <p>"{report.reason}"</p>
                       </div>
                     </div>

                     <div className="flex flex-wrap gap-2 mt-4 relative z-10">
                       <Button onClick={() => handleToggleUserStatus(report.sellerId, 'banned')} className="rounded-none font-mono text-[10px] uppercase font-bold border-2 border-destructive bg-destructive text-destructive-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 transition-all">Ban User</Button>
                       <Button onClick={() => handleDeleteTicket(report.ticketId)} variant="outline" className="rounded-none font-mono text-[10px] uppercase font-bold border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 transition-all">Remove Ticket</Button>
                     </div>
                   </div>
                 ))}
                 
                 {ticketReports.length === 0 && (
                   <div className="border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 bg-muted/20 flex items-center justify-center min-h-[200px]">
                     <div className="text-center">
                       <h4 className="font-heading font-black text-xl uppercase mb-2 text-muted-foreground">No Active Reports</h4>
                       <p className="font-mono text-xs font-bold text-muted-foreground">System is currently clear.</p>
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-muted text-foreground px-3 py-1 border-2 border-foreground inline-block mb-8">Audit Logs</h3>
                <div className="space-y-4">
                  {logs.map((activity, i) => (
                     <div key={activity.id} className="flex flex-col md:flex-row md:items-center justify-between border-2 border-foreground p-4 bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <div className="flex gap-4 items-center mb-2 md:mb-0">
                           <Activity className="w-5 h-5 text-muted-foreground shrink-0" />
                           <div>
                              <p className="font-heading font-black uppercase text-lg leading-none">{activity.action}</p>
                              <p className="font-mono text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{activity.details}</p>
                           </div>
                        </div>
                        <div className="font-mono text-[10px] font-bold bg-foreground text-background px-3 py-1 uppercase tracking-widest border border-foreground">
                           {activity.time}
                        </div>
                     </div>
                  ))}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="admins" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Admin List Column */}
                <div className="lg:col-span-1 space-y-4">
                   {pendingAdmins.length > 0 && (
                      <div className="bg-amber-100 border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 mb-8">
                         <div className="flex justify-between items-center mb-6 border-b-2 border-foreground pb-4">
                            <h3 className="font-heading text-2xl font-black uppercase tracking-tighter text-amber-900 flex items-center gap-2">
                               <AlertCircle className="w-5 h-5"/> Pending Requests
                            </h3>
                            <Badge className="bg-amber-500 text-black hover:bg-amber-500 rounded-none border-2 border-foreground">{pendingAdmins.length}</Badge>
                         </div>
                         <div className="space-y-3">
                            {pendingAdmins.map(admin => (
                               <div key={admin.id} className="border-2 border-foreground bg-background p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                  <h4 className="font-heading font-black text-lg">{admin.name}</h4>
                                  <p className="font-mono text-[10px] text-muted-foreground mt-1 mb-3">{admin.email}</p>
                                  <div className="flex gap-2">
                                     <Button onClick={() => handleApproveAdmin(admin.id)} size="sm" className="flex-1 rounded-none border-2 border-foreground bg-emerald-500 text-white hover:bg-emerald-600 font-bold uppercase text-[10px]">Approve</Button>
                                     <Button onClick={() => handleRejectAdmin(admin.id)} size="sm" className="flex-1 rounded-none border-2 border-foreground bg-destructive text-white hover:bg-red-600 font-bold uppercase text-[10px]">Reject</Button>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}

                   <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6">
                      <div className="flex justify-between items-center mb-6 border-b-2 border-foreground pb-4">
                         <h3 className="font-heading text-2xl font-black uppercase tracking-tighter">System Admins</h3>
                         <Button onClick={() => setIsAddAdminOpen(true)} size="sm" variant="outline" className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background font-mono text-[10px] uppercase font-bold"><Plus className="w-4 h-4 mr-1"/> New</Button>
                      </div>
                      
                      <div className="space-y-3">
                         {adminsList.map(admin => (
                            <div 
                               key={admin.id} 
                               onClick={() => setSelectedAdminId(admin.id)}
                               className={`border-2 p-4 cursor-pointer transition-all ${selectedAdminId === admin.id ? 'border-primary bg-primary/5 shadow-[4px_4px_0_0_rgba(16,185,129,1)]' : 'border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1'}`}
                            >
                               <div className="flex justify-between items-start">
                                  <div>
                                     <h4 className="font-heading font-black text-lg flex items-center gap-2">
                                        {admin.name} 
                                        {admin.isSelf && <Badge variant="default" className="text-[8px] px-1 h-4 rounded-none bg-foreground text-background">YOU</Badge>}
                                     </h4>
                                     <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">{admin.role}</p>
                                  </div>
                                  <Shield className={`w-5 h-5 ${admin.role === 'Super Admin' ? 'text-destructive' : 'text-primary'}`} />
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Permissions Config Column */}
                <div className="lg:col-span-2">
                   {selectedAdminId ? (() => {
                      const admin = adminsList.find(a => a.id === selectedAdminId)!;
                      return (
                         <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-foreground pb-6 mb-8 gap-4">
                               <div>
                                  <h3 className="font-heading text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                     <Settings className="w-8 h-8 text-primary" />
                                     Manage Access
                                  </h3>
                                  <p className="font-mono text-xs uppercase tracking-widest font-bold text-muted-foreground mt-2">Editing permissions for {admin.name}</p>
                               </div>
                               {!admin.isSelf && (
                                  <div className="flex gap-2">
                                     <Button onClick={() => handleRemoveAdmin(admin.id)} variant="outline" size="sm" className="rounded-none border-2 border-destructive text-destructive font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-destructive hover:text-white transition-all">
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Remove Admin
                                     </Button>
                                  </div>
                               )}
                            </div>

                            {!admin.isSelf && (
                               <div className="mb-8 p-6 border-2 border-foreground bg-muted flex flex-col sm:flex-row items-center gap-6 justify-between">
                                  <div>
                                     <h4 className="font-heading text-lg font-black uppercase">Role Presets</h4>
                                     <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase mt-1">Apply pre-defined permission sets</p>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                     {Object.keys(PRESETS).map(preset => (
                                        <Button 
                                           key={preset} 
                                           onClick={() => handleSelectPreset(admin.id, preset as any)}
                                           size="sm" 
                                           variant={admin.role === preset ? 'default' : 'outline'}
                                           className={`rounded-none border-2 font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${admin.role === preset ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground hover:translate-y-1'}`}
                                        >
                                           {preset}
                                        </Button>
                                     ))}
                                  </div>
                               </div>
                            )}

                            {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category))).map(category => (
                               <div key={category} className="mb-8 last:mb-0">
                                  <h4 className="font-heading text-xl font-black uppercase mb-4 py-2 border-b-2 border-dashed border-foreground/30 text-foreground/70">{category}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(permission => {
                                        const isEnabled = admin.permissions.includes(permission.id);
                                        return (
                                           <div 
                                              key={permission.id}
                                              className={`flex items-center justify-between p-4 border-2 transition-colors ${isEnabled ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-background'}`}
                                           >
                                              <Label htmlFor={`perm-${admin.id}-${permission.id}`} className="font-mono font-bold text-xs uppercase cursor-pointer flex-1 user-select-none">
                                                 {permission.label}
                                              </Label>
                                              <Switch 
                                                 id={`perm-${admin.id}-${permission.id}`}
                                                 checked={isEnabled}
                                                 onCheckedChange={() => handleTogglePermission(admin.id, permission.id)}
                                                 disabled={admin.isSelf}
                                                 className="data-[state=checked]:bg-emerald-500 rounded-none border-2 border-foreground"
                                              />
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            ))}
                         </div>
                      );
                   })() : (
                      <div className="h-full min-h-[400px] border-4 border-dashed border-foreground/20 flex flex-col items-center justify-center text-center p-8 bg-muted/20">
                         <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
                         <h3 className="font-heading text-2xl font-black uppercase tracking-tighter text-muted-foreground">No Admin Selected</h3>
                         <p className="font-mono text-xs uppercase tracking-widest font-bold text-muted-foreground/50 mt-2">Select an admin from the list to view and manage their permissions.</p>
                      </div>
                   )}
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Admin Modal */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tighter flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Add New Admin
            </DialogTitle>
            <DialogDescription className="font-mono text-xs font-bold uppercase tracking-widest mt-2">
              Create a new administrator account and assign initial role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Admin Name</Label>
              <Input 
                value={newAdminName} 
                onChange={e => setNewAdminName(e.target.value)} 
                placeholder="Name" 
                className="rounded-none border-2 border-foreground font-mono text-xs focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Email Address</Label>
              <Input 
                value={newAdminEmail} 
                onChange={e => setNewAdminEmail(e.target.value)} 
                placeholder="admin@example.com" 
                type="email"
                className="rounded-none border-2 border-foreground font-mono text-xs focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Role Preset</Label>
              <Select value={newAdminRole} onValueChange={(v: any) => setNewAdminRole(v)}>
                <SelectTrigger className="w-full bg-background rounded-none border-2 border-foreground focus:ring-0 focus:border-foreground font-mono text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground">
                  {Object.keys(PRESETS).map(preset => (
                    <SelectItem key={preset} value={preset} className="rounded-none focus:bg-foreground focus:text-background font-mono text-xs uppercase">{preset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
             <Button variant="outline" onClick={() => setIsAddAdminOpen(false)} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
               Cancel
             </Button>
             <Button onClick={handleAddAdmin} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-primary bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
               Add Admin
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditModalOpen(false);
          setCurrentEditTicket(null);
        }
      }}>
        <DialogContent className="rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tighter">
              Edit Ticket {currentEditTicket?.id}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTicket} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase tracking-widest">Transport Name</Label>
              <Input 
                name="transportName"
                defaultValue={currentEditTicket?.transportName || ""}
                placeholder="e.g. Sonar Bangla Express"
                required
                className="rounded-none border-2 border-foreground font-mono text-sm focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase tracking-widest">Selling Price (৳)</Label>
              <Input 
                name="sellingPrice"
                type="number"
                min="1"
                defaultValue={currentEditTicket?.sellingPrice || ""}
                placeholder="e.g. 1000"
                required
                className="rounded-none border-2 border-foreground font-mono text-sm focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs font-bold uppercase tracking-widest">Status</Label>
              <Select name="status" defaultValue={currentEditTicket?.status === "active" ? "available" : (currentEditTicket?.status || "available")}>
                <SelectTrigger className="rounded-none border-2 border-foreground font-mono text-sm focus:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground">
                  <SelectItem value="available" className="font-mono text-xs uppercase">Available</SelectItem>
                  <SelectItem value="sold" className="font-mono text-xs uppercase">Mark As Sold</SelectItem>
                  <SelectItem value="expired" className="font-mono text-xs uppercase">Expire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-4 mt-8 border-t-2 border-foreground">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="mr-4 rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
                Cancel
              </Button>
              <Button type="submit" className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-primary bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
