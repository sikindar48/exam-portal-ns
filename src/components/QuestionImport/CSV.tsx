import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  parseCSV,
  downloadCSVTemplate,
  ParsedQuestion,
} from "@/utils/csvParser";
import { validateQuestions, ValidationError } from "@/utils/questionValidator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";

interface CSVProps {
  onImportSuccess: (importedIds?: string[]) => void;
  /** If provided, imported questions are also linked to this test */
  testId?: string;
  /** If provided, imported questions are placed in this section */
  sectionId?: string;
  /** Custom trigger element; defaults to a button */
  trigger?: React.ReactNode;
}

export default function CSV({
  onImportSuccess,
  testId,
  sectionId,
  trigger,
}: CSVProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<
    { row: number; message: string }[]
  >([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const { clientId } = useAuth();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setQuestions([]);
    setParseErrors([]);
    setValidationErrors([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { questions: parsedQuestions, errors } = parseCSV(text);
      setParseErrors(errors);
      if (parsedQuestions.length > 0) {
        setQuestions(parsedQuestions);
        setValidationErrors(validateQuestions(parsedQuestions));
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: "Please fix all validation errors before importing",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    // Strip rowNumber before inserting
    const questionsToInsert = questions.map(({ rowNumber, ...q }) => ({
      ...q,
      client_id: clientId,
    }));

    let successCount = 0;
    let failedCount = 0;
    const insertedIds: string[] = [];

    const batchSize = 50;
    for (let i = 0; i < questionsToInsert.length; i += batchSize) {
      const batch = questionsToInsert.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from("questions")
        .insert(batch)
        .select("id");

      if (error) {
        failedCount += batch.length;
        console.error("Import error:", error);
      } else {
        successCount += batch.length;
        if (data) insertedIds.push(...data.map((r: { id: string }) => r.id));
      }

      setImportProgress(
        Math.round(((i + batch.length) / questionsToInsert.length) * 100),
      );
    }

    // If linked to a test, create test_questions rows
    if (testId && insertedIds.length > 0) {
      const linkRows = insertedIds.map((qId) => ({
        test_id: testId,
        question_id: qId,
      }));

      await supabase.from("test_questions").insert(linkRows);
    }

    setImportResult({ success: successCount, failed: failedCount });
    setImporting(false);

    if (successCount > 0) {
      toast({
        title: "Import Complete",
        description: `${successCount} question${successCount !== 1 ? "s" : ""} imported${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      });
      onImportSuccess(insertedIds);
    }

    if (failedCount === questionsToInsert.length) {
      toast({
        title: "Import Failed",
        description:
          "All questions failed to import. Please check the format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setQuestions([]);
    setParseErrors([]);
    setValidationErrors([]);
    setImportResult(null);
    setImportProgress(0);
  };

  const validQuestions = questions.filter(
    (q) => !validationErrors.some((e) => e.row === q.rowNumber),
  );

  const defaultTrigger = (
    <Button variant="outline">
      <Upload className="mr-2 h-4 w-4" />
      Import CSV
    </Button>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Questions from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <span className="text-sm text-muted-foreground">
              Columns: question_text, option_a–d, correct_answer, marks
            </span>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
          />

          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Parsing Errors:</div>
                <ul className="list-disc list-inside mt-2">
                  {parseErrors.map((error, idx) => (
                    <li key={idx}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Validation Errors:</div>
                <ul className="list-disc list-inside mt-2 max-h-32 overflow-y-auto">
                  {validationErrors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>
                      Row {error.row}, {error.field}: {error.message}
                    </li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="text-muted-foreground">
                      … and {validationErrors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {questions.length > 0 && validationErrors.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {validQuestions.length} valid question
                {validQuestions.length !== 1 ? "s" : ""} ready to import
                {testId && " and link to this test"}
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing… {importProgress}%
              </p>
            </div>
          )}

          {importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Import completed: {importResult.success} successful
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </AlertDescription>
            </Alert>
          )}

          {questions.length > 0 && (
            <div className="border rounded-md">
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.slice(0, 50).map((q) => {
                      const hasError = validationErrors.some(
                        (e) => e.row === q.rowNumber,
                      );
                      return (
                        <TableRow
                          key={q.rowNumber}
                          className={hasError ? "bg-destructive/10" : ""}
                        >
                          <TableCell>{q.rowNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {q.question_text}
                          </TableCell>
                          <TableCell>{q.correct_answer}</TableCell>
                          <TableCell>{q.marks}</TableCell>
                          <TableCell>
                            {hasError ? (
                              <span className="text-destructive text-xs">
                                Error
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs">
                                Valid
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {questions.length > 50 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          … and {questions.length - 50} more questions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                questions.length === 0 ||
                validationErrors.length > 0 ||
                importing ||
                importResult !== null
              }
            >
              {importing ? "Importing…" : "Import Questions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
