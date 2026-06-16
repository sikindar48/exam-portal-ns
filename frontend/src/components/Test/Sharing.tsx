import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { testsApi } from "@/integrations/turso/client";
import { Copy, Link, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";

interface SharingProps {
  test: {
    id: string;
    test_name: string;
    share_code: string;
    public_link_enabled: boolean;
  };
  onUpdate: () => void;
}

export default function Sharing({ test, onUpdate }: SharingProps) {
  const [open, setOpen] = useState(false);
  const [publicEnabled, setPublicEnabled] = useState(test.public_link_enabled);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const { toast } = useToast();

  const testLink = `${window.location.origin}/join/${test.share_code}`;

  // Generate QR code when dialog opens and public link is enabled
  useEffect(() => {
    if (open && publicEnabled) {
      QRCode.toDataURL(testLink, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [open, publicEnabled, testLink]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const togglePublicLink = async (enabled: boolean) => {
    setPublicEnabled(enabled);
    await testsApi.update(test.id, { public_link_enabled: enabled });
    onUpdate();
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share: {test.test_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Invite Code */}
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <div className="flex gap-2">
                <Input
                  value={test.share_code}
                  readOnly
                  className="font-mono text-lg tracking-widest"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(test.share_code, "Invite code")
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Students can enter this code to join the test
              </p>
            </div>

            {/* Public Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Public Link</Label>
                <Switch
                  checked={publicEnabled}
                  onCheckedChange={togglePublicLink}
                />
              </div>
              {publicEnabled && (
                <div className="flex gap-2">
                  <Input value={testLink} readOnly className="text-sm" />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(testLink, "Test link")}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* QR Code */}
            {publicEnabled && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code
                </Label>
                <div className="flex justify-center rounded-lg border bg-background p-4">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code for test link"
                      className="rounded"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Students can scan this QR code to access the test
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
