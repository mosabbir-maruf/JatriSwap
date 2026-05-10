import * as React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/src/lib/firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, Key, User, Mail, ShieldAlert, Trash2 } from "lucide-react";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header shown above the account form (defaults to seller-facing copy). */
  dialogTitle?: string;
}

export function EditProfileDialog({ open, onOpenChange, dialogTitle = "Edit Profile" }: EditProfileDialogProps) {
  const user = auth.currentUser;
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const hasPassword = user?.providerData.some(p => p.providerId === 'password');

  useEffect(() => {
    if (open && user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
      setNewPassword("");
      setOldPassword("");
    }
  }, [open, user]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (window.confirm("WARNING: This will permanently delete your account, tickets, and all associated data. This action cannot be undone. Are you sure you want to proceed?")) {
      setIsDeleting(true);
      try {
        if (hasPassword && !oldPassword) {
           toast.error("Please enter your current password to verify it's you before deleting the account.");
           setIsDeleting(false);
           return;
        }
        if (hasPassword) {
          const credential = EmailAuthProvider.credential(user.email!, oldPassword);
          try {
             await reauthenticateWithCredential(user, credential);
          } catch (err: any) {
             toast.error("Incorrect current password.");
             setIsDeleting(false);
             return;
          }
        }
        
        // Delete all user data from Firestore
        const { deleteUserData } = await import("@/src/lib/firebase/users");
        await deleteUserData(user.uid);
        
        // Delete user auth record
        await deleteUser(user);
        toast.success("Account successfully deleted");
        onOpenChange(false);
      } catch (error: any) {
        console.error("Failed to delete account:", error);
        if (error.code === 'auth/requires-recent-login') {
          toast.error("Security requirement: Please sign out and sign in again before deleting your account.");
        } else {
          toast.error("Failed to delete account: " + (error.message || "Unknown error"));
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    let successCount = 0;
    
    try {
      const emailChanged = email !== user.email && email.trim() !== "";
      const passwordChanging = newPassword.trim() !== "";
      
      if (emailChanged || passwordChanging) {
        if (hasPassword) {
          if (!oldPassword) {
             toast.error("Please enter your current password to change email or password.");
             setIsSubmitting(false);
             return;
          }
          const credential = EmailAuthProvider.credential(user.email!, oldPassword);
          try {
             await reauthenticateWithCredential(user, credential);
          } catch (err: any) {
             toast.error("Incorrect current password.");
             setIsSubmitting(false);
             return;
          }
        }
      }

      if (name !== user.displayName) {
        await updateProfile(user, { displayName: name });
        await updateDoc(doc(db, "users", user.uid), { name });
        successCount++;
      }
      
      if (emailChanged) {
        await updateEmail(user, email);
        successCount++;
      }
      
      if (passwordChanging) {
        await updatePassword(user, newPassword);
        successCount++;
      }
      
      if (successCount > 0) {
        toast.success("Profile updated successfully!");
        onOpenChange(false);
      } else {
         toast.info("No changes were made.");
         onOpenChange(false);
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Security requirement: Please sign out and sign in again before changing sensitive information like email or password.");
      } else {
        toast.error("Failed to update profile: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-foreground shadow-[12px_12px_0_0_rgba(0,0,0,1)] p-0 gap-0 overflow-hidden bg-background">
        <div className="bg-foreground text-background p-6 border-b-4 border-foreground relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-background/10 rounded-full translate-x-16 -translate-y-16 blur-2xl group-hover:bg-primary/20 transition-colors duration-500"></div>
           <DialogTitle className="font-heading text-2xl uppercase font-black tracking-tight relative z-10 flex items-center gap-2">
             {dialogTitle}
           </DialogTitle>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <User className="w-3 h-3" /> Full Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-none border-2 border-foreground h-12 font-mono shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[4px_4px_0_0_var(--color-primary)] transition-all"
                placeholder="Your name"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email Address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-none border-2 border-foreground h-12 font-mono shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[4px_4px_0_0_var(--color-primary)] transition-all"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div className="space-y-2 border-t-2 border-dashed border-muted-foreground/30 pt-4 mt-2">
              {hasPassword && (
                <div className="space-y-2 mb-4">
                  <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                    <Key className="w-3 h-3" /> Current Password
                  </Label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="rounded-none border-2 border-foreground h-12 font-mono shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[4px_4px_0_0_var(--color-primary)] transition-all"
                    placeholder="Required to change email or password"
                  />
                </div>
              )}
              
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <Key className="w-3 h-3" /> {hasPassword ? "New Password (Optional)" : "Set New Password"}
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-none border-2 border-foreground h-12 font-mono shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[4px_4px_0_0_var(--color-primary)] transition-all"
                placeholder={hasPassword ? "Leave blank to keep current" : "Set a new password here"}
              />
              <p className="font-mono text-[10px] text-muted-foreground flex flex-center gap-1 mt-1 break-words">
                <ShieldAlert className="w-3 h-3 inline flex-shrink-0"/> Requires recent login to change sensitive info
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t-4 border-foreground">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-none border-2 border-foreground h-12 font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex-1 rounded-none border-2 border-foreground bg-primary text-primary-foreground h-12 font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
            
            <div className="border-t-2 border-dashed border-destructive/30 pt-4 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteAccount}
                disabled={isSubmitting || isDeleting}
                className="w-full rounded-none border-2 border-destructive text-destructive bg-destructive/5 h-12 font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(220,38,38,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(220,38,38,1)] hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
