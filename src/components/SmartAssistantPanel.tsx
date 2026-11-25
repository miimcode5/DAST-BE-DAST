import { AlertCircle, Check, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import { CATEGORY_MAP, HELP_TYPE_MAP } from '../constants/categories';
import { analyzeRequestDraft } from '../lib/smartAssistant';
import type { HelpCategory, HelpType } from '../types/database';

interface SmartAssistantPanelProps {
  title: string;
  description: string;
  category: HelpCategory | '';
  helpType: HelpType | '';
  area: string;
  neededAt: string;
  onApplyCategory: (cat: HelpCategory) => void;
  onApplyHelpType: (type: HelpType) => void;
  onApplyTitle: (title: string) => void;
}

export function SmartAssistantPanel({
  title,
  description,
  category,
  helpType,
  area,
  neededAt,
  onApplyCategory,
  onApplyHelpType,
  onApplyTitle,
}: SmartAssistantPanelProps) {
  const hasEnoughInput = title.trim().length >= 3 || description.trim().length >= 6;
  if (!hasEnoughInput) {
    return (
      <div className="rounded-2xl border border-[#DCEBDD] bg-[#DCEBDD]/35 p-4 text-xs leading-6 text-[#344634]">
        <div className="mb-1 flex items-center gap-1.5 font-bold text-[#174D35]">
          <Lightbulb className="h-4 w-4 text-[#E9B949]" />
          <span>پیشنهادگر محلی ثبت درخواست</span>
        </div>
        با نوشتن عنوان و توضیح کوتاه، دستیار قانون‌محور محلی به‌صورت خودکار دسته‌بندی مناسب، نوع کمک و نکات تکمیل فرم را به شما پیشنهاد می‌دهد.
      </div>
    );
  }

  const analysis = analyzeRequestDraft({
    title,
    description,
    category,
    helpType,
    area,
    neededAt,
  });

  const hasAnything =
    analysis.suggestedCategory ||
    analysis.suggestedHelpType ||
    analysis.suggestedTitle ||
    analysis.missingInfoWarnings.length > 0 ||
    analysis.privacyWarnings.length > 0 ||
    analysis.suggestedSkills.length > 0;

  if (!hasAnything) return null;

  return (
    <div className="rounded-2xl border border-[#78B98A]/50 bg-[#DCEBDD]/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-[#174D35]">
          <Sparkles className="h-4 w-4 text-[#E9B949]" />
          <span>پیشنهادهای موتور محلی دست‌به‌دست</span>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[#26734B]">
          تحلیل خودکار محلی (مبتنی بر قوانین)
        </span>
      </div>

      {analysis.privacyWarnings.map((warn, i) => (
        <div
          key={`priv-${i}`}
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-800"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{warn}</span>
        </div>
      ))}

      {(analysis.suggestedCategory || analysis.suggestedHelpType || analysis.suggestedTitle) && (
        <div className="flex flex-wrap gap-2">
          {analysis.suggestedCategory && (
            <button
              type="button"
              onClick={() => onApplyCategory(analysis.suggestedCategory!)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#26734B]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D35] shadow-2xs transition hover:bg-[#174D35] hover:text-white"
            >
              <Check className="h-3.5 w-3.5" />
              پیشنهاد دسته‌بندی: {CATEGORY_MAP[analysis.suggestedCategory].label}
            </button>
          )}
          {analysis.suggestedHelpType && (
            <button
              type="button"
              onClick={() => onApplyHelpType(analysis.suggestedHelpType!)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#26734B]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D35] shadow-2xs transition hover:bg-[#174D35] hover:text-white"
            >
              <Check className="h-3.5 w-3.5" />
              پیشنهاد نوع کمک: {HELP_TYPE_MAP[analysis.suggestedHelpType].label}
            </button>
          )}
          {analysis.suggestedTitle && (
            <button
              type="button"
              onClick={() => onApplyTitle(analysis.suggestedTitle!)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#26734B]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D35] shadow-2xs transition hover:bg-[#174D35] hover:text-white"
            >
              <Check className="h-3.5 w-3.5" />
              بهبود عنوان به «{analysis.suggestedTitle}»
            </button>
          )}
        </div>
      )}

      {analysis.missingInfoWarnings.length > 0 && (
        <ul className="space-y-1.5">
          {analysis.missingInfoWarnings.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-6 text-[#344634]">
              <AlertCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-[#26734B]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {analysis.suggestedSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#344634]">
          <span className="font-semibold">مهارت‌های مرتبط برای داوطلبان:</span>
          {analysis.suggestedSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-lg bg-white/85 px-2 py-0.5 font-medium text-[#174D35]"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
