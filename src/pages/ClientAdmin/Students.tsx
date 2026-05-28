import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Users,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Toggle } from "@/components/Theme/Toggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Footer } from "@/components/Brand/Footer";
import { Progress } from "@/components/ui/progress";

interface ImportRow {
  name: string;
  email: string;
  password: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

export default function StudentsManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId } = useAuth();

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [hasStartedImport, setHasStartedImport] = useState(false);

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split(/\r?\n/);
    const parsed: ImportRow[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      if (parts[0]?.toLowerCase() === "name" && parts[1]?.toLowerCase() === "email") {
        continue;
      }
      
      if (parts.length >= 2) {
        const name = parts[0]?.replace(/^["']|["']$/g, "") || "";
        const email = parts[1]?.replace(/^["']|["']$/g, "") || "";
        const password = parts[2]?.replace(/^["']|["']$/g, "") || Math.random().toString(36).substring(2, 10);
        
        if (name && email) {
          parsed.push({
            name,
            email,
            password,
            status: "pending",
          });
        }
      }
    }
    return parsed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setImportRows(parsed);
      setHasStartedImport(false);
      setProgressCount(0);
      toast({ title: "CSV Parsed", description: `Found ${parsed.length} candidate records.` });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (importRows.length === 0) return;
    
    setImporting(true);
    setHasStartedImport(true);
    setProgressCount(0);
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;

    const processRow = async (row: ImportRow, index: number) => {
      setImportRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: "processing" };
        return next;
      });

      try {
        const res = await fetch(`${baseUrl}/functions/v1/create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: apikey,
          },
          body: JSON.stringify({
            email: row.email.trim(),
            password: row.password,
            name: row.name.trim(),
            client_id: clientId,
            role: "student",
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to create account");
        }

        setImportRows((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: "success" };
          return next;
        });
      } catch (err: any) {
        setImportRows((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: "error", error: err.message || "Failed" };
          return next;
        });
      } finally {
        setProgressCount((prev) => prev + 1);
      }
    };

    const pool: Promise<void>[] = [];
    const maxConcurrency = 5;

    for (let i = 0; i < importRows.length; i++) {
      const p = processRow(importRows[i], i);
      pool.push(p);

      const cleanUp = p.then(() => {
        const idx = pool.indexOf(p);
        if (idx > -1) pool.splice(idx, 1);
      });

      if (pool.length >= maxConcurrency) {
        await Promise.race(pool);
      }
    }
    await Promise.all(pool);
    
    setImporting(false);
    toast({ title: "Import Cycle Complete", description: "All CSV rows have been processed." });
    fetchStudents();
  };

  useEffect(() => {
    if (clientId) {
      fetchStudents();
    }
  }, [clientId]);

  const fetchStudents = async () => {
    setFetchLoading(true);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("client_id", clientId)
      .eq("role", "student");

    if (roleError) {
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
      setFetchLoading(false);
      return;
    }

    if (!roleData || roleData.length === 0) {
      setStudents([]);
      setFetchLoading(false);
      return;
    }

    const studentIds = roleData.map((r) => r.user_id);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .in("id", studentIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } else {
      setStudents(data || []);
    }
    setFetchLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          client_id: clientId,
          role: "student",
        }),
      },
    );

    const result = await res.json();

    if (!res.ok) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setCreatedCredentials({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
      });
      setIsCredentialsDialogOpen(true);
      setIsDialogOpen(false);
      fetchStudents();
      setFormData({ name: "", email: "", password: "" });
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.rpc("delete_student", { _student_id: id });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      fetchStudents();
    }
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/client-admin")}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Candidate Management</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Student Enrollment & Access Controls</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Toggle />

          <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
            if (!importing) {
              setIsImportDialogOpen(open);
              if (!open) {
                setImportRows([]);
                setHasStartedImport(false);
                setProgressCount(0);
              }
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="h-9 px-6 rounded-none border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest"
              >
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-blue-500" /> Bulk Import (CSV)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-none border-t-4 border-t-blue-600 bg-white dark:bg-slate-900 overflow-hidden flex flex-col max-h-[85vh] p-0">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Bulk Candidate Import</DialogTitle>
              </DialogHeader>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
                {!hasStartedImport && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-tight space-y-1">
                    <p className="font-black text-[10px] tracking-widest">CSV Format Instructions:</p>
                    <p className="normal-case font-medium text-slate-500 dark:text-slate-400">
                      The file must contain columns: <span className="font-bold">name, email, password</span>.
                      The first row is automatically skipped if it contains headers.
                    </p>
                  </div>
                )}

                {!hasStartedImport && (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center cursor-pointer hover:border-blue-500 transition-all relative rounded-none">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                      Select or Drag CSV File
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                      Max file size: 5MB
                    </p>
                  </div>
                )}

                {importRows.length > 0 && (
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {importRows.length} Candidate Records Detected
                      </p>
                      {hasStartedImport && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                          {progressCount} / {importRows.length} Processed
                        </span>
                      )}
                    </div>

                    {hasStartedImport && (
                      <div className="space-y-2 shrink-0">
                        <Progress value={(progressCount / importRows.length) * 100} className="h-2 rounded-none bg-slate-100 dark:bg-slate-800" />
                      </div>
                    )}

                    <div className="flex-1 min-h-[200px] border border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-2">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Password</th>
                            <th className="p-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50">
                              <td className="p-2 font-bold uppercase truncate max-w-[150px]">{row.name}</td>
                              <td className="p-2 font-medium text-slate-500 truncate max-w-[200px]">{row.email}</td>
                              <td className="p-2 font-mono text-slate-400 select-all">{row.password}</td>
                              <td className="p-2 text-right font-black uppercase tracking-widest text-[9px]">
                                {row.status === "pending" && <span className="text-slate-400">Pending</span>}
                                {row.status === "processing" && <span className="text-blue-500 animate-pulse">Running</span>}
                                {row.status === "success" && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 border border-green-100">Success</span>}
                                {row.status === "error" && (
                                  <span className="text-red-600 bg-red-50 px-1.5 py-0.5 border border-red-100" title={row.error}>
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex justify-end gap-2 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                <Button
                  variant="ghost"
                  disabled={importing}
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportRows([]);
                    setHasStartedImport(false);
                    setProgressCount(0);
                  }}
                  className="h-10 rounded-none font-bold uppercase text-[10px] tracking-widest"
                >
                  Close
                </Button>
                {importRows.length > 0 && !hasStartedImport && (
                  <Button
                    onClick={handleImport}
                    className="h-10 rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-8"
                  >
                    Start Import
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="h-9 px-6 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg"
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Register Student
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-t-4 border-t-blue-600">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">New Candidate Enrollment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-medium"
                    required
                  />
                </div>
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-11 rounded-none bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px]"
                  >
                    {loading ? "Initializing..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Credentials Display Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="max-w-md rounded-none border-t-4 border-t-green-600">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-green-600 text-xl font-black uppercase tracking-tight">
              <Check className="h-6 w-6" />
              Enrollment Success
            </DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-6 pt-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900">
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-[0.2em] mb-1">Security Protocol</p>
                <p className="text-xs text-amber-600 dark:text-amber-600/80 font-medium leading-relaxed">
                  Save these credentials immediately. For security reasons, passwords cannot be recovered once this window is closed.
                </p>
              </div>
              
              <div className="space-y-4 rounded-none border border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Candidate Name</Label>
                  <div className="flex items-center gap-2">
                    <Input value={createdCredentials.name} readOnly className="h-10 rounded-none bg-white dark:bg-slate-950 font-bold border-slate-200 dark:border-slate-800" />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-none border-slate-200 dark:border-slate-800"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.name);
                        toast({ title: "Copied", description: "Name copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Login Identifier (Email)</Label>
                  <div className="flex items-center gap-2">
                    <Input value={createdCredentials.email} readOnly className="h-10 rounded-none bg-white dark:bg-slate-950 font-bold border-slate-200 dark:border-slate-800" />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-none border-slate-200 dark:border-slate-800"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.email);
                        toast({ title: "Copied", description: "Email copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Access Password</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={createdCredentials.password}
                      readOnly
                      className="h-10 rounded-none bg-white dark:bg-slate-950 font-bold border-slate-200 dark:border-slate-800"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-none border-slate-200 dark:border-slate-800"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-none border-slate-200 dark:border-slate-800"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.password);
                        toast({ title: "Copied", description: "Password copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsCredentialsDialogOpen(false);
                  setCreatedCredentials(null);
                  setShowPassword(false);
                }}
                className="w-full h-11 rounded-none bg-slate-900 dark:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px]"
              >
                Confirm & Finalize
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-10">
          
          <section>
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Student Directory
                </h2>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  {students.length} Records
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Candidate Full Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Email Identifier</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Registration Date</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Account Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetchLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                          <Users className="h-12 w-12 opacity-20" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">No Active Enrollments</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Start building your student directory by adding candidates.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight py-4">
                          {student.name}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400 py-4">{student.email}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-500 tabular-nums py-4">
                          {new Date(student.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(student.id)}
                            className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:border-red-200 transition-all p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Are you sure ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              You are about to permanently delete this candidate's account and all associated examination records. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
}
