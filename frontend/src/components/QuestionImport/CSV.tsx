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
import { questionsApi, testQuestionsApi, testSectionsApi } from "@/services/api/client";
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
  onImportSuccess: (importedIds?: string[], parsedQuestions?: any[]) => void;
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

  const [cachedExisting, setCachedExisting] = useState<any[]>([]);

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

        // Fetch existing questions ONCE and cache for reuse during import
        const { data } = await questionsApi.list({ client_id: clientId });
        const existing = data || [];
        setCachedExisting(existing);

        const normalize = (text?: string) => (text || "").trim().toLowerCase().replace(/\s+/g, " ");
        const getQuestionKey = (q: any, targetClientId: string) => {
          const text = normalize(q.question_text);
          const type = q.question_type || "mcq";
          return `${text}|${type}|${targetClientId}`;
        };

        const existingKeys = new Set(
          existing.map((q) => getQuestionKey(q, q.client_id || clientId))
        );

        const duplicates = parsedQuestions
          .filter((q) => existingKeys.has(getQuestionKey(q, clientId)))
          .map((q) => q.rowNumber);

        setDuplicateRows(duplicates.length > 0 ? new Set(duplicates) : new Set());
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

    // Reuse cached existing questions — avoid second full fetch
    const existingData = cachedExisting.length > 0
      ? cachedExisting
      : ((await questionsApi.list({ client_id: clientId })).data || []);

    const normalize = (text?: string) => (text || "").trim().toLowerCase().replace(/\s+/g, " ");
    const getQuestionKey = (q: any, targetClientId: string) => {
      const text = normalize(q.question_text);
      const type = q.question_type || "mcq";
      return `${text}|${type}|${targetClientId}`;
    };

    const existingKeys = new Set(
      existingData.map((q) => getQuestionKey(q, q.client_id || clientId))
    );

    const existingKeyToIdMap: Record<string, string> = {};
    for (const q of existingData) {
      existingKeyToIdMap[getQuestionKey(q, q.client_id || clientId)] = q.id;
    }

    // Strip rowNumber
    const allQuestions = questions.map(({ rowNumber, ...q }) => ({
      ...q,
      difficulty: q.difficulty || "medium",
      client_id: clientId,
      import_batch_id: importBatchId,
    }));

    const questionsToInsert = allQuestions.filter(
      (q) => !existingKeys.has(getQuestionKey(q, clientId))
    );
    const skippedCount = allQuestions.length - questionsToInsert.length;

    let successCount = 0;
    let failedCount = 0;
    // Track items to link along with their parsed section_name
    const itemsToLink: { questionId: string; sectionName?: string }[] = [];

    // Collect skipped duplicate IDs and batch-update image_urls in one call
    const imageUrlUpdates: { id: string; image_url: string }[] = [];
    for (const q of allQuestions) {
      const key = getQuestionKey(q, clientId);
      if (existingKeys.has(key)) {
        const existingId = existingKeyToIdMap[key];
        if (existingId) {
          itemsToLink.push({ questionId: existingId, sectionName: q.section_name });
          if (q.image_url) {
            imageUrlUpdates.push({ id: existingId, image_url: q.image_url });
          }
        }
      }
    }

    // Single batch call to update image URLs for all duplicates at once
    if (imageUrlUpdates.length > 0) {
      await questionsApi.bulkUpdateImageUrls(imageUrlUpdates);
    }

    setImportProgress(10);

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
            list.forEach((r: { id: string }, idx: number) => {
              const origQ = batch[idx];
              itemsToLink.push({ questionId: r.id, sectionName: origQ?.section_name });
            });
          }
        }

        setImportProgress(
          10 + Math.round(((i + batch.length) / questionsToInsert.length) * 80),
        );
      }
    }

    setImportProgress(90);

    // If linked to a test, handle section resolution and create test_questions rows
    if (testId && itemsToLink.length > 0) {
      // 1. Fetch existing test sections
      const { data: existingSecs } = await testSectionsApi.list(testId).catch(() => ({ data: [] }));
      const sectionMap: Record<string, string> = {};

      if (existingSecs && Array.isArray(existingSecs)) {
        existingSecs.forEach((sec: any) => {
          if (sec.name) sectionMap[sec.name.trim().toLowerCase()] = sec.id;
        });
      }

      // 2. Identify unique section_names from CSV that don't exist yet and create them
      const missingSectionNames = Array.from(
        new Set(itemsToLink.map((item) => item.sectionName?.trim()).filter(Boolean) as string[])
      ).filter((name) => !sectionMap[name.toLowerCase()]);

      for (const newSecName of missingSectionNames) {
        try {
          const createRes = await testSectionsApi.create({
            test_id: testId,
            name: newSecName,
          });
          if (createRes.data && createRes.data.id) {
            sectionMap[newSecName.toLowerCase()] = createRes.data.id;
          }
        } catch (secErr) {
          console.error(`Failed to auto-create section '${newSecName}':`, secErr);
        }
      }

      // 3. Build test_questions link rows with correct section_id
      const linkRows = itemsToLink.map(({ questionId, sectionName }) => {
        let matchedSecId = sectionId || null;
        if (sectionName && sectionMap[sectionName.trim().toLowerCase()]) {
          matchedSecId = sectionMap[sectionName.trim().toLowerCase()];
        }
        return {
          test_id: testId,
          question_id: questionId,
          section_id: matchedSecId,
        };
      });

      await testQuestionsApi.add(testId, linkRows);
    }

    setImportProgress(100);

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
      onImportSuccess(itemsToLink.map(i => i.questionId), allQuestions);
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
      <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col p-6 rounded-none border border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-3 border-b pr-10">
          <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-between">
            <span>Import Questions from CSV</span>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCSVTemplate}
              className="h-8 text-xs font-bold uppercase rounded-none border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 select-none transition-colors"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Download Template
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 overflow-y-auto pr-1">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">Supported CSV Columns:</span>
              <p className="text-slate-500 font-mono text-[11px] leading-relaxed">
                section_name (optional), question_text, question_type, option_a–d, correct_answer, marks, negative_marks, difficulty, explanation, image_url
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-none file:border-0
              file:text-xs file:font-black file:uppercase
              file:bg-slate-900 file:text-white
              hover:file:bg-black cursor-pointer border border-slate-200 dark:border-slate-800"
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
            <Alert className="border-green-200 bg-green-50/50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="font-semibold text-xs">
                {validQuestions.length} valid question
                {validQuestions.length !== 1 ? "s" : ""} ready to import
                {testId && " and link to this test"}
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-xs font-bold text-center text-slate-500">
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
            <div className="border border-slate-200 dark:border-slate-800 flex-1 overflow-hidden">
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm">
                    <TableRow className="border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="w-12 text-[10px] font-black uppercase tracking-wider text-slate-500">Row</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">Section</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[180px]">Question</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-16 text-center">Image</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">Type</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-center w-20">Answer</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-center w-16">Marks</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-center w-16">Penalty</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">Difficulty</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-right w-28">Status</TableHead>
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
                          className={hasError ? "bg-red-50/50 dark:bg-red-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50"}
                        >
                          <TableCell className="font-mono text-xs text-slate-500 font-bold">{q.rowNumber}</TableCell>
                          <TableCell className="text-xs">
                            {q.section_name ? (
                              <span className="inline-block uppercase tracking-wider font-bold text-[9px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                {q.section_name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                            {q.question_text}
                          </TableCell>
                          <TableCell className="text-center">
                            {q.image_url ? (
                              <img
                                src={q.image_url}
                                alt="Preview"
                                className="h-7 w-9 object-contain mx-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-block uppercase tracking-wider font-bold text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {q.question_type === "true_false" ? "True/False" : "MCQ"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-center">{q.correct_answers.join(", ")}</TableCell>
                          <TableCell className="text-xs font-bold text-center text-blue-600">+{q.marks}</TableCell>
                          <TableCell className="text-xs font-bold text-center text-red-500">{q.negative_marks ? `-${q.negative_marks}` : "0"}</TableCell>
                          <TableCell className="capitalize text-xs font-semibold text-slate-600 dark:text-slate-400">{q.difficulty || "medium"}</TableCell>
                          <TableCell className="text-right">
                            {hasError ? (
                              <span className="text-red-600 text-[10px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/50 px-2 py-0.5 border border-red-200 dark:border-red-900">
                                ERROR
                              </span>
                            ) : duplicateRows.has(q.rowNumber) ? (
                              <span className="text-amber-600 text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 border border-amber-200 dark:border-amber-900">
                                DUPLICATE
                              </span>
                            ) : (
                              <span className="text-green-600 text-[10px] font-black uppercase tracking-wider bg-green-50 dark:bg-green-950/50 px-2 py-0.5 border border-green-200 dark:border-green-900">
                                VALID
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
                          className="text-center text-xs text-slate-400 py-3"
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

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose} className="rounded-none h-9 text-xs uppercase font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-none h-9 text-xs font-black uppercase tracking-wider"
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
