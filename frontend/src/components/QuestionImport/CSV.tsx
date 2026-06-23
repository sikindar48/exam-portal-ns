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
import { questionsApi, testQuestionsApi } from "@/services/api/client";
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
  /** Custom trigger element; defaults to a button. Pass null to disable trigger rendering. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CSV({
  onImportSuccess,
  testId,
  sectionId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CSVProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<
    { row: number; message: string }[]
  >([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [importing, setImporting] = useState(false);
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [importBatchId, setImportBatchId] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    skipped: number;
    total: number;
    durationMs: number;
    batchId: string;
  } | null>(null);
  const [isRolledBack, setIsRolledBack] = useState(false);
  const { clientId } = useAuth();
  const { toast } = useToast();

  const generateUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

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
    setIsRolledBack(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const batchId = generateUUID();
      setImportBatchId(batchId);

      const { questions: parsedQuestions, errors } = parseCSV(text, batchId);
      setParseErrors(errors);

      if (parsedQuestions.length > 0) {
        setQuestions(parsedQuestions);
        setValidationErrors(validateQuestions(parsedQuestions));

        // Check for duplicates immediately
        const { data } = await questionsApi.list({ client_id: clientId });

        const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
        const existingKeys = new Set(
          (data || []).map(
            (q) =>
              `${normalize(q.question_text)}|${
                q.question_type || "mcq"
              }|${q.client_id || clientId}`
          )
        );

        const duplicates = parsedQuestions
          .filter((q) =>
            existingKeys.has(
              `${normalize(q.question_text)}|${
                q.question_type
              }|${clientId}`
            )
          )
          .map((q) => q.rowNumber);

        if (duplicates.length > 0) {
          setDuplicateRows(new Set(duplicates));
        } else {
          setDuplicateRows(new Set());
        }
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0 || parseErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: "Please fix all errors before importing",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const startTime = performance.now();

    // Fetch existing question texts to prevent duplicates
    const { data: existingData, error: fetchError } = await questionsApi.list({
      client_id: clientId,
    });

    if (fetchError) {
      toast({
        title: "Import Error",
        description: "Failed to check for existing questions",
        variant: "destructive",
      });
      setImporting(false);
      return;
    }

    const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
    const existingKeys = new Set(
      (existingData || []).map(
        (q) =>
          `${normalize(q.question_text)}|${
            q.question_type || "mcq"
          }|${q.client_id || clientId}`
      )
    );

    const existingKeyToIdMap: Record<string, string> = {};
    if (existingData) {
      for (const q of existingData) {
        const key = `${normalize(q.question_text)}|${q.question_type || "mcq"}|${q.client_id || clientId}`;
        existingKeyToIdMap[key] = q.id;
      }
    }

    // Strip rowNumber and filter duplicates
    const allQuestions = questions.map(({ rowNumber, ...q }) => ({
      ...q,
      difficulty: q.difficulty || "medium",
      client_id: clientId,
      import_batch_id: importBatchId,
    }));

    const questionsToInsert = allQuestions.filter(
      (q) =>
        !existingKeys.has(
          `${normalize(q.question_text)}|${q.question_type}|${clientId}`
        )
    );
    const skippedCount = allQuestions.length - questionsToInsert.length;

    let successCount = 0;
    let failedCount = 0;
    const idsToLink: string[] = [];

    // Add skipped ones (already existing in DB) to idsToLink
    allQuestions.forEach((q) => {
      const key = `${normalize(q.question_text)}|${q.question_type}|${clientId}`;
      if (existingKeys.has(key)) {
        const existingId = existingKeyToIdMap[key];
        if (existingId) {
          idsToLink.push(existingId);
        }
      }
    });

    if (questionsToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < questionsToInsert.length; i += batchSize) {
        const batch = questionsToInsert.slice(i, i + batchSize);

        const { data, error } = await questionsApi.create(batch);

        if (error) {
          failedCount += batch.length;
          console.error("Import error:", error);
        } else {
          successCount += batch.length;
          if (data) {
            const list = Array.isArray(data) ? data : [data];
            const newIds = list.map((r: { id: string }) => r.id);
            idsToLink.push(...newIds);
          }
        }

        setImportProgress(
          Math.round(((i + batch.length) / questionsToInsert.length) * 100),
        );
      }
    }

    // If linked to a test, create test_questions rows
    if (testId && idsToLink.length > 0) {
      const linkRows = idsToLink.map((qId) => ({
        test_id: testId,
        question_id: qId,
      }));

      await testQuestionsApi.add(testId, linkRows);
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    setImportResult({
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: questions.length,
      durationMs,
      batchId: importBatchId,
    });
    setImporting(false);

    if (successCount > 0 || skippedCount > 0) {
      toast({
        title: "Import Complete",
        description: `${successCount} imported, ${skippedCount} skipped (already exist)${
          failedCount > 0 ? `, ${failedCount} failed` : ""
        }`,
      });
      onImportSuccess(idsToLink);
    }

    if (failedCount === questionsToInsert.length && questionsToInsert.length > 0) {
      toast({
        title: "Import Failed",
        description:
          "All questions failed to import. Please check the format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleRollback = async () => {
    if (!importResult) return;

    const { data, error } = await questionsApi.rollback(importResult.batchId);

    if (error) {
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback imported questions",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Rollback Successful",
        description: `Rollback completed. Removed imported questions.`,
      });
      setIsRolledBack(true);
      onImportSuccess([]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setQuestions([]);
    setParseErrors([]);
    setValidationErrors([]);
    setDuplicateRows(new Set());
    setImportResult(null);
    setImportProgress(0);
    setIsRolledBack(false);
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
      {trigger !== null && (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      )}
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
              Columns: question_text, question_type, option_a–d, correct_answer, marks, negative_marks, difficulty, explanation
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

          {questions.length > 0 && validationErrors.length === 0 && parseErrors.length === 0 && (
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
            <Alert className={isRolledBack ? "border-destructive bg-destructive/5" : "border-green-200 bg-green-50/50"}>
              {isRolledBack ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
              <AlertDescription className="space-y-2">
                <div className="font-semibold text-foreground">
                  {isRolledBack ? "Import Rolled Back" : "Import Summary"}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground max-w-md">
                  <div>Total Processed:</div>
                  <div className="font-medium text-foreground">{importResult.total}</div>
                  <div>Successfully Imported:</div>
                  <div className="font-medium text-foreground">{isRolledBack ? 0 : importResult.success}</div>
                  <div>Skipped (Duplicates):</div>
                  <div className="font-medium text-foreground">{importResult.skipped}</div>
                  <div>Failed:</div>
                  <div className="font-medium text-foreground">{importResult.failed}</div>
                  <div>Duration:</div>
                  <div className="font-medium text-foreground">{importResult.durationMs} ms</div>
                  <div>Batch ID:</div>
                  <div className="font-mono text-xs text-foreground truncate select-all">{importResult.batchId}</div>
                </div>
                {!isRolledBack && importResult.success > 0 && (
                  <div className="pt-2">
                    <Button variant="destructive" size="sm" onClick={handleRollback}>
                      Rollback Import
                    </Button>
                  </div>
                )}
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
                      <TableHead>Type</TableHead>
                      <TableHead>Correct Answer(s)</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Negative Marks</TableHead>
                      <TableHead>Difficulty</TableHead>
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
                          <TableCell className="capitalize text-xs font-mono">{q.question_type}</TableCell>
                          <TableCell className="text-xs">{q.correct_answers.join(", ")}</TableCell>
                          <TableCell className="text-xs">{q.marks}</TableCell>
                          <TableCell className="text-xs">{q.negative_marks}</TableCell>
                          <TableCell className="capitalize text-xs">{q.difficulty}</TableCell>
                          <TableCell>
                            {hasError ? (
                              <span className="text-destructive text-xs font-bold uppercase tracking-tight">
                                Error
                              </span>
                            ) : duplicateRows.has(q.rowNumber) ? (
                              <span className="text-amber-600 text-xs font-bold uppercase tracking-tight bg-amber-50 px-2 py-0.5 border border-amber-100">
                                Duplicate (Will Skip)
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs font-bold uppercase tracking-tight">
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
                          colSpan={8}
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
                parseErrors.length > 0 ||
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
