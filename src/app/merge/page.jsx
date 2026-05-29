'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Check,
  FileCode2,
  ChevronDown,
  Save,
  X,
  Plus,
  Pencil,
  Braces,
  ListTree,
  GitPullRequest,
  AlertTriangle
} from 'lucide-react'

// --- Utility Functions for Deep Object Manipulation ---
const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item)

const getDiffs = (targetObj, editorObj, path = '') => {
  let diffs = []
  const keys = new Set([...Object.keys(targetObj || {}), ...Object.keys(editorObj || {})])

  keys.forEach(key => {
    const val1 = targetObj ? targetObj[key] : undefined
    const val2 = editorObj ? editorObj[key] : undefined
    const currentPath = path ? `${path}.${key}` : key

    if (isObject(val1) && isObject(val2)) {
      diffs = [...diffs, ...getDiffs(val1, val2, currentPath)]
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push({
        id: currentPath,
        keyPath: currentPath,
        oldContent: val1 !== undefined ? JSON.stringify(val1) : undefined,
        newContent: val2 !== undefined ? JSON.stringify(val2) : undefined,
        rawNewValue: val2
      })
    }
  })
  return diffs
}

const setNestedValue = (obj, path, value) => {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {}
    current = current[keys[i]]
  }
  if (value === undefined) {
    delete current[keys[keys.length - 1]]
  } else {
    current[keys[keys.length - 1]] = value
  }
}

export default function JsonMergeEditor () {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState('No changes saved yet.')
  const [viewMode, setViewMode] = useState('json')
  const [isEditing, setIsEditing] = useState(false)
  const [isValidJson, setIsValidJson] = useState(true)

  // 1. Mock Database of Target Files
  const [targetData, setTargetData] = useState({
    'production_config.json': {
      merge_config: {
        rule_1: { type: 'join', left: 400 },
        join_config: { join_1: { right: 'users', on: [2, 3], how: false } }
      }
    },
    'staging_config.json': {
      merge_config: {
        rule_1: { type: 'split', left: 100 }
      }
    }
  })
  const [targetSource, setTargetSource] = useState('production_config.json')

  // 2. Editor State
  const [jsonContent, setJsonContent] = useState(JSON.stringify({
    merge_config: {
      rule_1: {
        type: 'join',
        left: 423,
        join_config: {
          join_1: {
            right: 'join',
            on: [2, 3, 5, 3],
            how: true
          }
        }
      }
    }
  }, null, 2))

  // 3. Diff/Merge State
  const [computedDiffs, setComputedDiffs] = useState([])
  const [diffStatuses, setDiffStatuses] = useState({}) // Tracks accepted/rejected state by path

  // Recalculate Diffs whenever JSON or Target changes
  useEffect(() => {
    try {
      const parsedEditor = JSON.parse(jsonContent)
      setIsValidJson(true)

      const targetObj = targetData[targetSource]
      const newDiffs = getDiffs(targetObj, parsedEditor)
      setComputedDiffs(newDiffs)

      // Clear status for diffs that no longer exist
      setDiffStatuses(prev => {
        const next = { ...prev }
        const activeIds = new Set(newDiffs.map(d => d.id))
        Object.keys(next).forEach(key => {
          if (!activeIds.has(key)) delete next[key]
        })
        return next
      })
    } catch (e) {
      setIsValidJson(false)
      setComputedDiffs([])
    }
  }, [jsonContent, targetSource, targetData])

  const handleDiffAction = (id, action) => {
    setDiffStatuses(prev => ({ ...prev, [id]: action }))
  }

  // Perform the actual Merge
  const handleSave = (e) => {
    e.preventDefault()
    if (!isValidJson) return

    // Deep clone the target
    const targetObj = JSON.parse(JSON.stringify(targetData[targetSource]))
    let mergeCount = 0

    // Apply all diffs that are NOT rejected
    computedDiffs.forEach(diff => {
      const status = diffStatuses[diff.id] || 'pending'
      if (status !== 'rejected') {
        setNestedValue(targetObj, diff.keyPath, diff.rawNewValue)
        mergeCount++
      }
    })

    if (mergeCount === 0 && computedDiffs.length > 0) {
      setSaveStatus('No changes applied. All diffs were rejected.')
      return
    }

    // Update "Database"
    setTargetData(prev => ({
      ...prev,
      [targetSource]: targetObj
    }))

    // Format successful save message
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setSaveStatus(`Successfully merged ${mergeCount} change(s) into ${targetSource} at ${time}.`)

    // Reset statuses
    setDiffStatuses({})
  }

  const highlightJSON = (json) => {
    if (!json) return ''
    const formatted = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return formatted.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\]:,])/g, (match) => {
      let cls = 'text-white'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // Keys: Pink
          const key = match.slice(0, -1)
          return `<span class="text-[#f28bdc]">${key}</span><span class="text-[#8d70d6]">:</span>`
        } else {
          // Strings: Green
          cls = 'text-[#78e3b2]'
        }
      } else if (/true|false|null/.test(match)) {
        // Booleans: Orange
        cls = 'text-[#e6a567]'
      } else if (/^-?\d/.test(match)) {
        // Numbers: Cyan / Light Blue
        cls = 'text-[#64b5f6]'
      } else if (/[{}[\]:,]/.test(match)) {
        // Punctuation & Brackets: Muted Purple
        cls = 'text-[#8d70d6]'
      }
      return `<span class="${cls}">${match}</span>`
    })
  }
  return (
    <div className='min-h-screen bg-[#f4f3ee] text-black'>
      <main className='mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-8 py-10 lg:px-10 lg:py-12'>
        {/* Header */}
        <header className='mb-10 flex items-start justify-between gap-8'>
          <div className='max-w-2xl'>
            <div className='mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#614051] ring-1 ring-black/10'>
              <span className='h-1.5 w-1.5 rounded-full bg-[#614051]' />
              Merge workspace
            </div>
            <h1 className='text-4xl font-light tracking-tight text-black lg:text-5xl'>
              JSON editor & merging tool
            </h1>
            <p className='mt-4 max-w-xl text-sm font-normal leading-6 text-black/65'>
              Edit a merge configuration, choose the target JSON source, and save a clean version for downstream processing.
            </p>
          </div>

          <div className='hidden items-center gap-3 rounded-lg bg-white px-5 py-4 ring-1 ring-black/10 lg:flex'>
            <span className='text-xs font-medium text-black'>Create Project</span>
            <label
              htmlFor='create-project-toggle'
              className='relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-[#f4f3ee] ring-1 ring-black/15 transition has-[:checked]:bg-[#614051]'
            >
              <input
                id='create-project-toggle'
                type='checkbox'
                className='peer sr-only'
                checked={isModalOpen}
                onChange={(e) => setIsModalOpen(e.target.checked)}
              />
              <span className='h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition peer-checked:translate-x-5' />
            </label>
          </div>
        </header>

        {/* Main Grid */}
        <section className='grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'>

          {/* Left Column - Editor */}
          <article className='overflow-hidden rounded-lg bg-white ring-1 ring-black/10 flex flex-col'>
            <div className='flex items-center justify-between border-b border-black/10 px-5 py-4'>
              <div>
                <h2 className='text-base font-light tracking-tight text-black'>Merge configuration</h2>
                <p className='mt-1 text-xs leading-5 text-black/55'>Small-type editor with structured syntax colors.</p>
              </div>

              <div className='flex items-center gap-3'>
                <div className='flex items-center rounded-lg bg-[#f4f3ee] p-1 ring-1 ring-black/10'>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${viewMode === 'json' ? 'bg-white shadow-sm text-black' : 'text-black/55 hover:text-black'}`}
                  >
                    <Braces size={14} /> JSON
                  </button>
                  <button
                    onClick={() => setViewMode('form')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${viewMode === 'form' ? 'bg-white shadow-sm text-black' : 'text-black/55 hover:text-black'}`}
                  >
                    <ListTree size={14} /> Form
                  </button>
                </div>

                <div className='hidden items-center gap-2 text-xs sm:flex'>
                  {isValidJson
                    ? (
                      <span className='inline-flex items-center gap-1.5 rounded-full bg-[#eef8f2] px-2.5 py-1 ring-1 ring-[#78e3b2]/40 text-[#196b42]'>
                        <Check size={14} /> Valid JSON
                      </span>
                      )
                    : (
                      <span className='inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 ring-1 ring-red-200 text-red-700 font-medium'>
                        <AlertTriangle size={14} /> Invalid Syntax
                      </span>
                      )}
                </div>
              </div>
            </div>

            <div className='px-5 py-5 flex-1 flex flex-col'>
              <div className='mb-3 flex items-center justify-between text-xs text-black/60'>
                <div className='inline-flex items-center gap-2'>
                  <FileCode2 size={16} className={isValidJson ? 'text-[#614051]' : 'text-red-500'} />
                  <span className='font-medium text-black'>merge_config.json</span>
                </div>
                <span>{jsonContent.split('\n').length} lines</span>
              </div>

              {viewMode === 'json' ? (
                <div className={`flex-1 flex flex-col overflow-hidden rounded-lg bg-[#241042] shadow-sm ring-1 transition ${isValidJson ? 'ring-black/15' : 'ring-red-500 shadow-red-500/20'}`}>
                  <div className='flex items-center justify-between border-b border-[#3b1a66] px-4 py-3 text-[13px] font-medium text-white'>
                    <span className='font-semibold tracking-wide'>Edit JSON</span>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition ${isEditing ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-[#bda6f6]'}`}
                    >
                      <Pencil size={12} />
                      {isEditing ? 'Close Editor' : 'Edit Code'}
                    </button>
                  </div>

                  <div className='relative flex flex-1 text-[13px] leading-[1.6] min-h-[400px] overflow-hidden'>
                    <div className='flex w-full h-full overflow-auto'>
                      {/* Line Numbers */}
                      <div className='sticky left-0 z-10 border-r border-[#3b1a66] bg-[#241042] py-5 px-4 text-right font-mono text-[#6b4b99] select-none min-h-full'>
                        {jsonContent.split('\n').map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>

                      {/* Code Editor Area */}
                      <div className='relative flex-1 min-w-max'>
                        {/* Render highlighted text or raw text if invalid */}
                        {isValidJson
                          ? (
                            <pre
                              className='m-0 py-5 px-6 font-mono pointer-events-none whitespace-pre'
                              dangerouslySetInnerHTML={{ __html: highlightJSON(jsonContent) }}
                            />
                            )
                          : (
                            <pre className='m-0 py-5 px-6 font-mono pointer-events-none whitespace-pre text-red-400'>
                              {jsonContent}
                            </pre>
                            )}

                        {/* Transparent overlay textarea for native editing */}
                        {isEditing && (
                          <textarea
                            value={jsonContent}
                            onChange={(e) => setJsonContent(e.target.value)}
                            spellCheck='false'
                            className='absolute inset-0 w-full h-full py-5 px-6 font-mono text-transparent bg-transparent caret-white outline-none resize-none overflow-hidden whitespace-pre m-0'
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Form View Placeholder */
                <div className='flex-1 flex items-center justify-center rounded-lg border border-black/10 bg-[#f4f3ee]/50 p-5 overflow-auto'>
                  <p className='text-sm font-medium text-black/40'>Form view syncs with JSON output.</p>
                </div>
              )}
            </div>
          </article>

          {/* Right Column - Sidebar */}
          <aside className='space-y-6'>
            <section className='rounded-lg bg-white p-5 ring-1 ring-black/10'>
              <h2 className='text-base font-light tracking-tight text-black'>Merge target</h2>
              <p className='mt-2 text-xs leading-5 text-black/60'>Select the JSON source that should receive the merged configuration.</p>

              <form onSubmit={handleSave} className='mt-5 space-y-5'>
                <div>
                  <label htmlFor='target-source' className='mb-2 block text-xs font-medium text-black'>Target source</label>
                  <div className='relative'>
                    <select
                      id='target-source'
                      value={targetSource}
                      onChange={(e) => setTargetSource(e.target.value)}
                      className='h-11 w-full appearance-none rounded-lg border border-black/15 bg-[#f4f3ee] px-3 pr-10 text-xs font-medium text-black outline-none transition focus:border-[#614051] focus:ring-2 focus:ring-[#614051]/20'
                    >
                      {Object.keys(targetData).map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#614051]' />
                  </div>
                </div>

                <button
                  type='submit'
                  disabled={!isValidJson || computedDiffs.length === 0}
                  className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 text-xs font-medium text-white transition hover:bg-[#614051] focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Save size={16} />
                  Save JSON
                </button>
              </form>
            </section>

            {/* Dynamic PR-Like Diff Section */}
            <section className='rounded-lg bg-white p-5 ring-1 ring-black/10'>
              <div className='flex items-center gap-2 mb-4'>
                <GitPullRequest size={18} className='text-[#614051]' />
                <h2 className='text-base font-medium tracking-tight text-black'>Review Changes</h2>
                {computedDiffs.length > 0 && (
                  <span className='ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#614051] text-[10px] font-bold text-white'>
                    {computedDiffs.length}
                  </span>
                )}
              </div>

              <div className='space-y-4'>
                {!isValidJson && (
                  <div className='p-3 text-xs text-red-700 bg-red-50 rounded border border-red-200'>
                    Fix JSON syntax to review changes.
                  </div>
                )}

                {isValidJson && computedDiffs.length === 0 && (
                  <div className='text-center py-6 bg-[#f4f3ee] rounded-lg border border-black/10 border-dashed'>
                    <Check size={24} className='mx-auto mb-2 text-black/30' />
                    <p className='text-xs text-black/60 font-medium'>Target matches editor.</p>
                  </div>
                )}

                {isValidJson && computedDiffs.map((diff) => {
                  const status = diffStatuses[diff.id] || 'pending'
                  return (
                    <div key={diff.id} className='rounded-lg border border-black/15 overflow-hidden bg-[#f8f7f4]'>
                      <div className='flex items-center justify-between px-3 py-2 bg-white border-b border-black/10'>
                        <span className='text-[11px] font-semibold text-black/70 font-mono tracking-tight truncate mr-2' title={diff.keyPath}>
                          {diff.keyPath}
                        </span>

                        {status === 'pending'
                          ? (
                            <div className='flex items-center gap-1.5 shrink-0'>
                              <button
                                onClick={() => handleDiffAction(diff.id, 'accepted')}
                                className='flex items-center gap-1 px-2 py-1 bg-[#196b42] text-white text-[10px] font-medium rounded hover:bg-[#135232] transition'
                              >
                                <Check size={12} /> Accept
                              </button>
                              <button
                                onClick={() => handleDiffAction(diff.id, 'rejected')}
                                className='flex items-center gap-1 px-2 py-1 bg-white border border-black/20 text-black text-[10px] font-medium rounded hover:bg-black/5 transition'
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                            )
                          : (
                            <div className='flex items-center gap-2'>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${status === 'accepted' ? 'text-[#196b42]' : 'text-[#d73a49]'}`}>
                                {status}
                              </span>
                              <button onClick={() => handleDiffAction(diff.id, 'pending')} className='text-black/40 hover:text-black'>
                                <X size={12} />
                              </button>
                            </div>
                            )}
                      </div>

                      <div className='font-mono text-[11px] leading-5 whitespace-pre overflow-x-auto'>
                        {diff.oldContent !== undefined && (
                          <div className={`flex px-3 py-1.5 ${status === 'rejected' ? 'bg-[#ffeef0]/50 text-[#b31d28]/50' : 'bg-[#ffeef0] text-[#b31d28]'}`}>
                            <span className='select-none w-5 opacity-50 shrink-0'>-</span>
                            <span>{diff.oldContent}</span>
                          </div>
                        )}
                        {diff.newContent !== undefined && (
                          <div className={`flex px-3 py-1.5 ${diff.oldContent !== undefined ? 'border-t border-black/5' : ''} ${status === 'rejected' ? 'opacity-50 line-through text-black/40 bg-transparent' : 'bg-[#e6ffed] text-[#22863a]'}`}>
                            <span className='select-none w-5 opacity-50 shrink-0'>+</span>
                            <span>{diff.newContent}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {saveStatus && (
                <div className='mt-5 p-3 text-xs font-medium bg-[#eef8f2] text-[#196b42] border border-[#78e3b2]/50 rounded-lg'>
                  {saveStatus}
                </div>
              )}
            </section>
          </aside>
        </section>
      </main>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl ring-1 ring-black/10'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-[#614051]'>New workspace</p>
                <h2 className='mt-2 text-xl font-light tracking-tight text-black'>Create project</h2>
                <p className='mt-2 text-xs leading-5 text-black/60'>Set up a project for editing and merging JSON sources.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f4f3ee] text-black transition hover:text-[#614051] focus:outline-none focus:ring-2 focus:ring-[#614051]/20'
              >
                <X size={16} />
              </button>
            </div>
            {/* Modal Body Removed for Brevity (Same as previous) */}
            <div className='flex items-center justify-end gap-3 pt-6'>
              <button type='button' onClick={() => setIsModalOpen(false)} className='inline-flex h-10 items-center justify-center rounded-lg bg-[#f4f3ee] px-4 text-xs font-medium text-black transition hover:text-[#614051]'>Cancel</button>
              <button type='button' onClick={() => setIsModalOpen(false)} className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-xs font-medium text-white transition hover:bg-[#614051]'><Plus size={16} /> Create project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
