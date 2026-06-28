import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  question_type?: string;
}

interface QuestionViewProps {
  question: Question;
  index: number;
  answer: string;
  onAnswer: (questionId: string, answer: string) => void;
}

export function QuestionView({
  question,
  index,
  answer,
  onAnswer,
}: QuestionViewProps) {
  return (
    <div className="max-w-3xl w-full space-y-6 md:space-y-8">
      {/* Question Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Question {index + 1}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1">
          {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
        </span>
      </div>

      {/* Question Text */}
      <p className="text-sm md:text-[15px] leading-6 md:leading-7 text-slate-800 dark:text-slate-100 font-medium">
        {question.question_text}
      </p>


      {/* Options */}
      <RadioGroup
        value={answer || ""}
        onValueChange={(val) => onAnswer(question.id, val)}
        className="space-y-2"
      >
        {(["A", "B", "C", "D"] as const).filter(opt => {
          if (question.question_type === "true_false" && (opt === "C" || opt === "D")) {
            return false;
          }
          const optText = (question as any)[`option_${opt.toLowerCase()}`];
          if (optText === undefined || optText === null || optText.trim() === "") {
            return false;
          }
          return true;
        }).map((opt) => {
          const optText = (question as any)[`option_${opt.toLowerCase()}`];
          const isSelected = answer === opt;
          return (
            <div
              key={opt}
              onClick={() => onAnswer(question.id, opt)}
              className={`flex cursor-pointer items-start gap-4 border px-5 py-3.5 transition-all ${
                isSelected
                  ? "border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950/30 border-t-blue-200 border-r-blue-200 border-b-blue-200 dark:border-t-blue-800 dark:border-r-blue-800 dark:border-b-blue-800 shadow-sm"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <RadioGroupItem
                value={opt}
                id={`opt-${opt}-${question.id}`}
                className="sr-only"
              />
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                }`}
              >
                {opt}
              </span>
              <span
                className={`text-sm leading-relaxed transition-colors ${
                  isSelected
                    ? "text-blue-900 dark:text-blue-100 font-bold"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {optText}
              </span>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
