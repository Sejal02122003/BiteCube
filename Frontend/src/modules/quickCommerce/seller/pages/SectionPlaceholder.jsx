import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@food/components/ui/card"

export default function SectionPlaceholder({ title, description, points = [] }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">
          Seller Panel
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-white/80">
          {description}
        </p>
      </section>

      <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
            Coming Next
          </CardTitle>
          <CardDescription>
            These seller tools are the next parts to connect in this panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {points.map((point) => (
            <div
              key={point}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
            >
              {point}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
