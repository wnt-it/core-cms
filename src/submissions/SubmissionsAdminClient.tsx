'use client'

// Quelle: template/src/app/admin/(dashboard)/submissions/SubmissionsAdminClient.tsx
// Imports auf core-cms-interne relative Pfade umgestellt; generische mailto-Betreffzeile
// (kein hartcodierter Firmenname mehr).

import { useState, useTransition, useEffect } from 'react'
import { Submission } from '../supabase/types'
import { createClient } from '../supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Trash2,
  Mail,
  Clock,
  Check,
  Globe,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react'

interface SubmissionsAdminClientProps {
  initialSubmissions: Submission[]
}

const STATUS_OPTIONS = [
  {
    value: 'Neu',
    label: 'Neu',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80',
    activeClass: 'bg-red-600 text-white shadow-sm'
  },
  {
    value: 'In Bearbeitung',
    label: 'In Bearbeitung',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80',
    activeClass: 'bg-amber-600 text-white shadow-sm'
  },
  {
    value: 'Erledigt',
    label: 'Erledigt',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80',
    activeClass: 'bg-emerald-600 text-white shadow-sm'
  }
] as const

export default function SubmissionsAdminClient({ initialSubmissions }: SubmissionsAdminClientProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null)
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setSubmissions(initialSubmissions)
  }, [initialSubmissions])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenStatusDropdownId(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  // Close slide-over on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSubmission(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredSubmissions = submissions.filter((s) => {
    const matchesType = typeFilter === 'all' || s.type === typeFilter
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.company && s.company.toLowerCase().includes(q)) ||
      (s.subject && s.subject.toLowerCase().includes(q)) ||
      (s.source_page && s.source_page.toLowerCase().includes(q)) ||
      (s.message && s.message.toLowerCase().includes(q))
    return matchesType && matchesStatus && matchesSearch
  })

  // Status ändern
  const updateStatus = async (id: string, newStatus: 'Neu' | 'In Bearbeitung' | 'Erledigt') => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)))
    if (activeSubmission?.id === id) {
      setActiveSubmission((prev) => (prev ? { ...prev, status: newStatus } : null))
    }
    setOpenStatusDropdownId(null)

    startTransition(async () => {
      const { error } = await supabase
        .from('submissions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        toast.error('Fehler beim Aktualisieren: ' + error.message)
        router.refresh()
      } else {
        toast.success(`Status auf „${newStatus}“ gesetzt`)
      }
    })
  }

  // Löschen
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eintrag von „${name}“ wirklich löschen?`)) return

    setSubmissions((prev) => prev.filter((s) => s.id !== id))
    if (activeSubmission?.id === id) setActiveSubmission(null)

    startTransition(async () => {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Fehler beim Löschen: ' + error.message)
        router.refresh()
      } else {
        toast.success('Eintrag gelöscht')
      }
    })
  }

  const getStatusObj = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
  }

  return (
    <div className="space-y-6">

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-black/5 shadow-sm">

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Absender, E-Mail, Firma, Herkunft oder Text suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-black/10 rounded-2xl text-xs font-medium text-black focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-all"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-neutral-50 border border-black/10 rounded-2xl text-xs font-bold text-neutral-700 focus:outline-none focus:border-green cursor-pointer"
          >
            <option value="all">Alle Formulare ({submissions.length})</option>
            <option value="Kontakt">Kontaktformular</option>
            <option value="Ausstellungsstück">Ausstellungsstücke</option>
            <option value="Anfrage">Allgemeine Anfrage</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-neutral-50 border border-black/10 rounded-2xl text-xs font-bold text-neutral-700 focus:outline-none focus:border-green cursor-pointer"
          >
            <option value="all">Alle Status</option>
            <option value="Neu">● Neu</option>
            <option value="In Bearbeitung">◐ In Bearbeitung</option>
            <option value="Erledigt">✓ Erledigt</option>
          </select>
        </div>

      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-neutral-50/70 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Datum & Uhrzeit</th>
                <th className="px-4 py-3.5">Typ / Herkunft</th>
                <th className="px-4 py-3.5">Absender</th>
                <th className="px-4 py-3.5">Betreff & Vorschau</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-medium">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400">
                    Keine Formulareingänge vorhanden.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const currentStatusObj = getStatusObj(sub.status)
                  const isDropdownOpen = openStatusDropdownId === sub.id
                  const isSelected = activeSubmission?.id === sub.id

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setActiveSubmission(sub)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-green/5 border-l-4 border-l-green'
                          : 'hover:bg-neutral-50/80'
                      }`}
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-neutral-500 font-mono text-[11px]">
                        {new Date(sub.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Type Badge & Source */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-block bg-neutral-100 text-neutral-800 border-neutral-200">
                            {sub.type}
                          </span>
                          {sub.source_page && (
                            <span className="text-[10px] text-neutral-400 block truncate max-w-[160px]" title={sub.source_page}>
                              {sub.source_page.split('(')[0].trim()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-extrabold text-black">{sub.name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">{sub.email}</div>
                        {sub.phone && <div className="text-[10px] text-neutral-400 mt-0.5">{sub.phone}</div>}
                      </td>

                      {/* Subject & Preview */}
                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="font-bold text-neutral-800 truncate">
                          {sub.subject || 'Kein Betreff'}
                        </div>
                        <div className="text-neutral-500 text-[11px] truncate mt-0.5 font-normal">
                          {sub.message || '–'}
                        </div>
                      </td>

                      {/* Interactive Status Pill Button */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenStatusDropdownId(isDropdownOpen ? null : sub.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold transition-all duration-150 cursor-pointer shadow-xs ${currentStatusObj.badgeClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${currentStatusObj.dotClass}`} />
                            <span>{currentStatusObj.label}</span>
                            <ChevronDown size={12} className={`shrink-0 opacity-60 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Floating Dropdown Menu */}
                          {isDropdownOpen && (
                            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-1.5 w-40 bg-white rounded-2xl shadow-xl border border-black/10 py-1.5 z-30 animate-in fade-in text-left">
                              {STATUS_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateStatus(sub.id, opt.value)}
                                  className={`w-full px-3.5 py-2 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                    sub.status === opt.value
                                      ? 'bg-neutral-100 text-black'
                                      : 'text-neutral-600 hover:bg-neutral-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                                    <span>{opt.label}</span>
                                  </div>
                                  {sub.status === opt.value && <Check size={13} className="text-green" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for full message details */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 overflow-hidden">

          {/* Backdrop */}
          <div
            onClick={() => setActiveSubmission(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer animate-in fade-in"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-black/10 flex flex-col animate-in slide-in-from-right duration-300">

              {/* Drawer Top Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-black/5 flex items-center justify-between bg-neutral-50/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-green/10 text-green">
                    {activeSubmission.type}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
                    <Clock size={13} />
                    {new Date(activeSubmission.created_at).toLocaleString('de-DE')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(activeSubmission.id, activeSubmission.name)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                    title="Anfrage löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setActiveSubmission(null)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-200/80 transition-all cursor-pointer"
                    title="Schließen (ESC)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

                {/* Betreff */}
                <div className="space-y-1 pb-4 border-b border-black/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green block">
                    Betreff / Anliegen
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight leading-tight">
                    {activeSubmission.subject || `${activeSubmission.type}-Anfrage`}
                  </h3>
                </div>

                {/* Quellseite */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-black/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                    <Globe size={13} className="text-green" />
                    <span>Herkunft</span>
                  </div>
                  <div className="text-xs font-extrabold text-black">
                    {activeSubmission.source_page || 'Kontaktseite (/kontakt)'}
                  </div>
                  {activeSubmission.source_url && (
                    <div className="text-[11px] text-neutral-500 font-mono">
                      Pfad: {activeSubmission.source_url}
                    </div>
                  )}
                </div>

                {/* Kontaktdaten */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Kontaktdaten des Absenders
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-5 bg-white rounded-2xl border border-black/10 shadow-xs text-xs">

                    <div>
                      <span className="text-neutral-400 block font-bold text-[10px] uppercase">Name</span>
                      <span className="font-extrabold text-black text-sm mt-0.5 block">{activeSubmission.name}</span>
                    </div>

                    <div>
                      <span className="text-neutral-400 block font-bold text-[10px] uppercase">E-Mail-Adresse</span>
                      <a
                        href={`mailto:${activeSubmission.email}?subject=Re: ${encodeURIComponent(activeSubmission.subject || 'Ihre Anfrage')}`}
                        className="font-bold text-green hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>{activeSubmission.email}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    {activeSubmission.phone && (
                      <div>
                        <span className="text-neutral-400 block font-bold text-[10px] uppercase">Telefon</span>
                        <a href={`tel:${activeSubmission.phone}`} className="font-bold text-neutral-800 hover:text-green mt-0.5 block">
                          {activeSubmission.phone}
                        </a>
                      </div>
                    )}

                    {activeSubmission.company && (
                      <div>
                        <span className="text-neutral-400 block font-bold text-[10px] uppercase">Firma</span>
                        <span className="font-bold text-neutral-800 mt-0.5 block">{activeSubmission.company}</span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Nachricht */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">
                    Nachricht
                  </span>
                  <div className="p-5 bg-neutral-50/70 rounded-2xl border border-black/10 text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap font-normal">
                    {activeSubmission.message || <span className="text-neutral-400 italic">Keine zusätzliche Nachricht übermittelt.</span>}
                  </div>
                </div>

                {/* Dynamische Zusatz- / Formulardaten (z. B. Projektdaten, Checkboxen, Sonderfelder) */}
                {activeSubmission.metadata && Object.keys(activeSubmission.metadata).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">
                      Zusätzliche Formular- & Projektdaten
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-2xl border border-black/5 text-xs">
                      {Object.entries(activeSubmission.metadata).map(([key, val]) => (
                        <div key={key} className="space-y-0.5">
                          <span className="text-neutral-400 block font-bold text-[10px] uppercase">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-black text-xs block">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status festlegen */}
                <div className="p-5 bg-white rounded-2xl border border-black/10 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-black block">Bearbeitungsstatus</span>
                      <span className="text-[11px] text-neutral-500 font-normal">Aktueller Stand dieser Anfrage:</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-xl">
                    {STATUS_OPTIONS.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => updateStatus(activeSubmission.id, st.value)}
                        className={`py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          activeSubmission.status === st.value
                            ? `${st.activeClass}`
                            : 'text-neutral-600 hover:text-black hover:bg-white/60'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${activeSubmission.status === st.value ? 'bg-white' : st.dotClass}`} />
                        <span>{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-5 sm:p-6 border-t border-black/5 bg-neutral-50/80 flex items-center justify-between gap-3">
                <a
                  href={`mailto:${activeSubmission.email}?subject=Re: ${encodeURIComponent(activeSubmission.subject || 'Ihre Anfrage')}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-green hover:bg-[#007a31] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Mail size={15} />
                  <span>Per E-Mail antworten</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveSubmission(null)}
                  className="py-3 px-5 rounded-xl bg-white border border-black/10 text-neutral-700 hover:bg-neutral-100 font-bold text-xs transition-all cursor-pointer"
                >
                  Schließen
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  )
}
