import { conditionLabel, type Condition } from "@/lib/catalog/conditions";

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <span className="inline-block rounded-sm border border-ink/20 px-1.5 py-0.5 text-xs font-medium text-ink">
      {conditionLabel(condition)}
    </span>
  );
}
