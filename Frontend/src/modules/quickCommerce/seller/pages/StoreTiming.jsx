import { useEffect, useRef, useState } from "react"
import { Clock3, Loader2 } from "lucide-react"
import { sellerAPI } from "@/services/api"
import { toast } from "sonner"

const getDefaultDays = () => ({
  Monday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Tuesday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Wednesday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Thursday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Friday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Saturday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Sunday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
})

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function SellerStoreTimingPage() {
  const [days, setDays] = useState(getDefaultDays)
  const [loading, setLoading] = useState(true)
  const [savingDay, setSavingDay] = useState("")
  const saveTimerRef = useRef(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadTimings = async () => {
      try {
        setLoading(true)
        const res = await sellerAPI.getStoreTimings()
        const storeTimings = res?.data?.data?.storeTimings || {}
        if (!cancelled) {
          setDays({ ...getDefaultDays(), ...storeTimings })
          hasLoadedRef.current = true
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Failed to load store timings")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTimings()
    return () => {
      cancelled = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const queueSave = (nextDays, focusDay = "") => {
    if (!hasLoadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSavingDay(focusDay)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await sellerAPI.saveStoreTimings(nextDays)
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to save store timings")
      } finally {
        setSavingDay("")
      }
    }, 400)
  }

  const updateDay = (day, patch) => {
    setDays((prev) => {
      const next = {
        ...prev,
        [day]: {
          ...prev[day],
          ...patch,
        },
      }
      queueSave(next, day)
      return next
    })
  }

  if (loading) {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center text-slate-500">Loading store timings...</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Store Timing</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">Manage Seller Store Hours</h1>
        <p className="mt-4 max-w-2xl text-sm text-white/80">
          Set daily opening and closing hours for your quick commerce store.
        </p>
      </section>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Weekly Schedule</h2>
            <p className="mt-1 text-sm text-slate-500">Changes save automatically after a short delay.</p>
          </div>
          {savingDay ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving {savingDay}...
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {dayNames.map((day) => {
            const dayData = days[day] || getDefaultDays()[day]
            return (
              <div key={day} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{day}</h3>
                      <p className="text-sm text-slate-500">
                        {dayData.isOpen ? `${dayData.openingTime} - ${dayData.closingTime}` : "Closed"}
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                    <span>{dayData.isOpen ? "Open" : "Closed"}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(dayData.isOpen)}
                      onChange={(e) =>
                        updateDay(day, {
                          isOpen: e.target.checked,
                          openingTime: e.target.checked ? (dayData.openingTime || "09:00") : "",
                          closingTime: e.target.checked ? (dayData.closingTime || "22:00") : "",
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                  </label>
                </div>

                {dayData.isOpen ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Opening Time</label>
                      <input
                        type="time"
                        value={dayData.openingTime || "09:00"}
                        onChange={(e) => updateDay(day, { openingTime: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Closing Time</label>
                      <input
                        type="time"
                        value={dayData.closingTime || "22:00"}
                        onChange={(e) => updateDay(day, { closingTime: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
