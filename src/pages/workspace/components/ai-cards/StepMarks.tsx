import { Check, LoaderCircle, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import "./ai-cards.css";

export function StepCheck({ className }: { className?: string }) {
  return <Check className={cn("ai-step-check", className)} size={16} />;
}
export function StepSpinner() {
  return <LoaderCircle className="ai-step-spinner animate-spin motion-reduce:animate-none" size={16} />;
}
export function StepCross() {
  return <X className="ai-step-cross" size={16} />;
}
