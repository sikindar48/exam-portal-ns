import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  testName: string;
  saving: boolean;
  onSave: () => void;
  onImport: () => void;
}

export function Header({ testName, saving, onSave, onImport }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/client-admin/tests")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-black uppercase tracking-tight">
              {testName || "Untitled Test"}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Test Builder Engine
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onImport}
              className="rounded transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Test"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
