import type { Reflection } from "@pejuang/shared";
import Card from "../ui/Card";

export const REFLECTION_COPY = {
  title: "Refleksimu",
  loading: "Menyusun refleksimu...",
  rulesLabel: "Insight berbasis aturan",
} as const;

/** Kartu Refleksi AI pribadi; `reflection` null berarti server masih menyusun. */
export default function ReflectionCard({
  reflection,
}: {
  reflection: Reflection | null | undefined;
}) {
  return (
    <Card title={REFLECTION_COPY.title} aria-busy={!reflection}>
      {!reflection ? (
        <p role="status" className="mt-2 text-body-sm text-teks-sekunder">
          {REFLECTION_COPY.loading}
        </p>
      ) : (
        <div className="mt-2 grid gap-3 text-body-sm">
          {reflection.source === "rules" ? (
            <p className="text-label text-teks-redup">{REFLECTION_COPY.rulesLabel}</p>
          ) : null}
          <p>{reflection.summary}</p>
          <ul className="grid gap-2">
            {reflection.insights.slice(0, 3).map((insight) => (
              <li key={insight.title} className="ui-note p-3">
                <p className="font-medium">{insight.title}</p>
                <p className="text-teks-sekunder">{insight.body}</p>
                {insight.reference ? (
                  <p className="mt-1 text-label text-teks-redup">{insight.reference}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
