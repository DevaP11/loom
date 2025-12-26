"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Minus,
  Dna,
  Plus,
  Trash2,
  FolderPlus,
  Info,
  Send,
  Upload,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  Pencil,
  Settings,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "./confirm-dialog"
import { AutoWidthInput } from "./auto-width-input"
import Link from "next/link"
import { getProjects, type ProjectConfig } from "./project-config"
import { SnackbarProvider, enqueueSnackbar } from 'notistack'
const PROJECTS = ["Entertainment Enlight"] as const
type ProjectName = (typeof PROJECTS)[number]

type FieldType = "string" | "number" | "boolean" | "array" | "json"

interface FormField {
  id: string
  name: string
  type: FieldType
  value: string | number | boolean | number[] | object
  comment?: string
}

interface FormSection {
  id: string
  name: string
  fields: FormField[]
  subsections: FormSection[]
}

type NestedComments = {
  [key: string]: string | NestedComments
}

interface ConfirmStateType {
  open: boolean
  title?: string
  description?: string
  action?: () => void
}

interface FieldTypeColor {
  string: string
  number: string
  boolean: string
  array: string
  json: string
}

const fieldTypeTextClass: FieldTypeColor = {
  string: "text-red-800",
  number: "text-yellow-800",
  boolean: "text-indigo-800",
  array: "text-green-800",
  json: "text-violet-800",
}

const getStorageKeyConfig = (project: string | null) =>
  project ? `dynamic-form-config-${project}` : "dynamic-form-config"

const getStorageKeyComments = (project: string | null) =>
  project ? `dynamic-form-comments-${project}` : "dynamic-form-comments"

function getFieldType(value: unknown): FieldType {
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "number") return "number"
  if (Array.isArray(value)) {
    const hasObjects = value.some((item) => item !== null && typeof item === "object")
    return hasObjects ? "json" : "array"
  }
  if (value !== null && typeof value === "object") return "json"
  return "string"
}

function getNestedComment(comments: NestedComments, path: string[]): string | undefined {
  let current: NestedComments | string | undefined = comments
  for (const key of path) {
    if (current === undefined || typeof current === "string") return undefined
    current = current[key]
  }
  return typeof current === "string" ? current : undefined
}

function setNestedComment(comments: NestedComments, path: string[], value: string): NestedComments {
  if (path.length === 0) return comments

  const result = { ...comments }
  const [first, ...rest] = path

  if (rest.length === 0) {
    if (value.trim()) {
      result[first] = value
    } else {
      delete result[first]
    }
  } else {
    const nested = result[first] && typeof result[first] === "object" ? (result[first] as NestedComments) : {}
    result[first] = setNestedComment(nested, rest, value)
  }

  return result
}

function parseConfigToSections(
  config: Record<string, unknown>,
  comments: NestedComments,
  parentPath: string[] = [],
): { generalFields: FormField[]; sections: FormSection[] } {
  const generalFields: FormField[] = []
  const sections: FormSection[] = []

  Object.entries(config).forEach(([key, value]) => {
    const currentPath = [...parentPath, key]

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nestedComments = comments[key] && typeof comments[key] === "object" ? (comments[key] as NestedComments) : {}
      const nested = parseConfigToSections(value as Record<string, unknown>, nestedComments, currentPath)
      const section: FormSection = {
        id: `section-${currentPath.join("-")}`,
        name: key,
        fields: nested.generalFields,
        subsections: nested.sections,
      }
      sections.push(section)
    } else {
      const comment = typeof comments[key] === "string" ? (comments[key] as string) : undefined
      const field: FormField = {
        id: `field-${currentPath.join("-")}`,
        name: key,
        type: getFieldType(value),
        value: value as string | number | boolean | number[] | object,
        comment,
      }
      generalFields.push(field)
    }
  })

  return { generalFields, sections }
}

function sectionsToConfig(sections: FormSection[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  sections.forEach((section) => {
    const sectionData: Record<string, unknown> = {}

    section.fields.forEach((field) => {
      sectionData[field.name] = formatFieldValue(field)
    })

    section.subsections.forEach((sub) => {
      sectionData[sub.name] = sectionsToConfig([sub])[sub.name]
    })

    result[section.name] = sectionData
  })

  return result
}

function sectionsToComments(sections: FormSection[]): NestedComments {
  const result: NestedComments = {}

  sections.forEach((section) => {
    const sectionComments: NestedComments = {}

    section.fields.forEach((field) => {
      if (field.comment?.trim()) {
        sectionComments[field.name] = field.comment
      }
    })

    section.subsections.forEach((sub) => {
      const nested = sectionsToComments([sub])
      if (Object.keys(nested).length > 0) {
        sectionComments[sub.name] = nested[sub.name]
      }
    })

    if (Object.keys(sectionComments).length > 0) {
      result[section.name] = sectionComments
    }
  })

  return result
}


function formatFieldValue(field: FormField): unknown {
  switch (field.type) {
    case "number":
      return Number(field.value) || 0
    case "boolean":
      return Boolean(field.value)
    case "array":
      if (Array.isArray(field.value)) return field.value
      if (typeof field.value === "string") {
        try {
          return JSON.parse(field.value)
        } catch {
          return field.value.split(",").map((v) => {
            const num = Number(v.trim())
            return isNaN(num) ? v.trim() : num
          })
        }
      }
      return [field.value]
    case "json":
      if (typeof field.value === "string") {
        try {
          return JSON.parse(field.value)
        } catch {
          return field.value
        }
      }
      return field.value
    default:
      return String(field.value)
  }
}

const exampleConfig: Record<string, unknown> = {}

const exampleComments: NestedComments = {}

const formatName = (str: string) => {
  if (str.length < 4) return str

  return str
    .replaceAll("-", "_")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .trim()
}

function EditCommentPopover({
  comment,
  fieldName,
  onSave
}: {
  comment?: string
  fieldName: string
  onSave?: (string) => void
}) {
  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<string>()

  useEffect(() => {
    setValue(comment || "")
  }, [comment])

  const handleSave = () => {
    onSave(value)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
        >
          {comment ? <Info className="h-3.5 w-3.5" /> : <Pencil className="h-3 w-3 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Comment for {formatName(fieldName)}</Label>
            <p className="text-xs text-muted-foreground">Add a description or help text for this field</p>
          </div>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter field description..."
            className="min-h-[80px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function EditSectionDialog({
  name,
  onSave,
}: {
  name: string
  onSave: (newName: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(name)

  useEffect(() => {
    setValue(name)
  }, [name])

  const handleSave = () => {
    if (!value.trim()) return
    onSave(value.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Section Name</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <Label>Section Name</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!value.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


function FormSectionComponent({
  sections,
  onUpdate,
  depth = 0,
  parentPath = "",
}: {
  sections: FormSection[]
  onUpdate: (sections: FormSection[]) => void
  depth?: number
  parentPath?: string
}) {
  const [expandedSections, setExpandedSections] = useState<string[]>(sections.map((s) => s.id))
  const [confirmState, setConfirmState] = useState<ConfirmStateType>({ open: false })

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  const updateField = (sectionId: string, fieldId: string, value: string | number | boolean | number[]) => {
    onUpdate(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) => (field.id === fieldId ? { ...field, value } : field)),
            }
          : section,
      ),
    )
  }

  const updateFieldComment = (sectionId: string, fieldId: string, comment: string) => {
    onUpdate(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, comment: comment || undefined } : field,
              ),
            }
          : section,
      ),
    )
  }

  const addField = (sectionId: string, field: Omit<FormField, "id">) => {
    onUpdate(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [...section.fields, { ...field, id: `field-${crypto.randomUUID()}` }],
            }
          : section,
      ),
    )
  }

  const removeField = (sectionId: string, fieldId: string) => {
    onUpdate(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.filter((field) => field.id !== fieldId),
            }
          : section,
      ),
    )
  }

  const addSubsection = (sectionId: string, subsectionName: string) => {
    const newSubsection: FormSection = {
      id: `subsection-${Date.now()}`,
      name: subsectionName,
      fields: [],
      subsections: [],
    }

    onUpdate(
      sections.map((section) =>
        section.id === sectionId ? { ...section, subsections: [...section.subsections, newSubsection] } : section,
      ),
    )
  }

  const updateSubsections = (sectionId: string, updatedSubsections: FormSection[]) => {
    onUpdate(
      sections.map((section) => (section.id === sectionId ? { ...section, subsections: updatedSubsections } : section)),
    )
  }

  const addSection = (sectionName: string) => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      name: sectionName,
      fields: [],
      subsections: [],
    }
    onUpdate([...sections, newSection])
    setExpandedSections((prev) => [...prev, newSection.id])
  }

  const removeSection = (sectionId: string) => {
    onUpdate(sections.filter((section) => section.id !== sectionId))
  }

  const renameSection = (sectionId: string, newName: string) => {
    if (!newName.trim()) return

    onUpdate(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, name: newName }
          : section
      )
    )
  }

  return (
    <TooltipProvider>
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmText="Delete"
        destructive
        onCancel={() => setConfirmState({ open: false })}
        onConfirm={() => confirmState.action?.()}
      />
      <div className="space-y-3">
        {sections.map((section) => {
          const sectionPath = parentPath ? `${parentPath}.${section.name}` : section.name
          const isExpanded = expandedSections.includes(section.id)
          const hasWideField = section.fields.some(f => typeof (f.value) === "string" && f.value?.length > 50);

          return (
            <Collapsible key={section.id} open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
              <div
                className={"bg-gradient-to-br from-card to-card/50 rounded-xl hover:shadow-md transition-all duration-200"}
                style={{ marginLeft: depth > 0 ? `${depth * 20}px` : 0 }}
              >
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-t-xl group">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-primary/75 group-hover:bg-primary transition-colors">
                      {isExpanded && <Minus className={`h-4 w-4 text-secondary transition-transform duration-200`} />}
                      {!isExpanded && <Plus className={`h-4 w-4 text-secondary transition-transform duration-200`} />}
                    </div>
                    <h2 className="text-base font-semibold text-foreground">{formatName(section.name)}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}
                    </span>
                    {depth === 0 && section.name !== "General" && (
                        <EditSectionDialog
                          name={section.name}
                          onSave={(newName) => renameSection(section.id, newName)}
                        />
                    )}
                    {depth === 0 && section.name !== "General" && (
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                         onClick={(e) => {
                           e.stopPropagation()
                           setConfirmState({
                             open: true,
                             title: `Delete section "${formatName(section.name)}"?`,
                             description: "This section and all nested fields will be permanently removed.",
                             action: () => removeSection(section.id),
                           })
                         }}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     )}
                    {depth > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmState({
                            open: true,
                            title: "Delete section?",
                            description: "This section and all nested fields will be removed.",
                            action: () => removeSection(section.id),
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-5 pt-2 space-y-5">
                    {section.fields.length > 0 && (
                      <div className={`grid gap-4 ${hasWideField ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`} >
                        {section.fields.map((field) => {
                          return (
                            <div key={field.id} className="space-y-2 group/field">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
                                    {formatName(field.name)}
                                  </Label>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded bg-muted/60 font-mono font-semibold ${
                                      fieldTypeTextClass[field.type?.toLowerCase() as keyof FieldTypeColor] ??
                                      "text-red-800"
                                    }`}
                                  >
                                    {field.type}
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <EditCommentPopover
                                          comment={field.comment}
                                          fieldName={field.name}
                                          onSave={(comment) => updateFieldComment(section.id, field.id, comment)}
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    {field.comment && (
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-sm">{field.comment}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover/field:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                  onClick={() =>
                                    setConfirmState({
                                      open: true,
                                      title: `Delete field "${field.name}"?`,
                                      description: "This section and all nested fields will be removed.",
                                      action: () => removeField(section.id, field.id),
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {field.type === "boolean" ? (
                                <div className="flex items-center h-10 px-3 border rounded-lg bg-background hover:bg-accent/5 transition-colors">
                                  <Switch
                                    id={field.id}
                                    checked={Boolean(field.value)}
                                    onCheckedChange={(checked) => updateField(section.id, field.id, checked)}
                                  />
                                  <span className="ml-3 text-sm font-medium">
                                    {field.value ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                              ) : field.type === "array" ? (
                                <Input
                                  id={field.id}
                                  value={Array.isArray(field.value) ? field.value.join(", ") : String(field.value)}
                                  onChange={(e) => {
                                    const arr = e.target.value.split(",").map((v) => {
                                      const num = Number(v.trim())
                                      return isNaN(num) ? v.trim() : num
                                    })
                                    updateField(section.id, field.id, arr)
                                  }}
                                  placeholder="Comma-separated values"
                                  className="bg-background hover:bg-accent/5 transition-colors border-muted-foreground/20 focus:border-primary"
                                />
                              ) : field.type === "json" ? (
                                <Textarea
                                  id={field.id}
                                  value={
                                    typeof field.value === "string" ? field.value : JSON.stringify(field.value, null, 2)
                                  }
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value)
                                      updateField(section.id, field.id, parsed)
                                    } catch {
                                      updateField(section.id, field.id, e.target.value)
                                    }
                                  }}
                                  placeholder="Enter JSON"
                                  className="bg-background hover:bg-accent/5 transition-colors font-mono text-xs min-h-[100px] border-muted-foreground/20 focus:border-primary"
                                />
                              ) : (
                                <AutoWidthInput
                                  id={field.id}
                                  type={field.type === "number" ? "number" : "text"}
                                  value={field.value as string | number}
                                  onChange={(e) =>
                                    updateField(
                                      section.id,
                                      field.id,
                                      field.type === "number" ? e.target.valueAsNumber || 0 : e.target.value,
                                    )
                                  }
                                  className="bg-background hover:bg-accent/5 transition-colors border-muted-foreground/20 focus:border-primary"
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <AddFieldDialog onAdd={(field) => addField(section.id, field)} />
                      <AddSubsectionDialog onAdd={(name) => addSubsection(section.id, name)} />
                    </div>

                    {section.subsections.length > 0 && (
                      <div className="pt-4">
                        <FormSectionComponent
                          sections={section.subsections}
                          onUpdate={(updated) => updateSubsections(section.id, updated)}
                          depth={depth + 1}
                          parentPath={sectionPath}
                        />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>

                <Separator className="my-4" />
              </div>
            </Collapsible>
          )
        })}

        {depth === 0 && <AddSectionDialog onAdd={addSection} />}
      </div>
    </TooltipProvider>
  )
}

function AddFieldDialog({ onAdd }: { onAdd: (field: Omit<FormField, "id">) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<FieldType>("string")
  const [value, setValue] = useState("")
  const [comment, setComment] = useState("")

  useEffect(() => {
    if (type === "boolean") setValue("false")
  }, [type])

  const handleAdd = () => {
    if (!name.trim()) return

    let parsedValue: string | number | boolean | number[] | object = value

    switch (type) {
      case "number":
        parsedValue = Number(value) || 0
        break
      case "boolean":
        parsedValue = value === "true"
        break
      case "array":
        parsedValue = value.split(",").map((v) => {
          const num = Number(v.trim())
          return isNaN(num) ? v.trim() : num
        }) as number[]
        break
      case "json":
        try {
          parsedValue = JSON.parse(value)
        } catch {
          parsedValue = {}
        }
        break
    }

    onAdd({ name, type, value: parsedValue, comment: comment || undefined })
    setName("")
    setType("string")
    setValue("")
    setComment("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all bg-transparent"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add New Field
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fieldName">Field Name</Label>
            <Input
              id="fieldName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CONFIG_KEY, Email, Amount"
              className="border-muted-foreground/20 focus:border-primary"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fieldType">Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger className="border-muted-foreground/20 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="array">Array</SelectItem>
                <SelectItem value="json">JSON Object</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fieldValue">Default Value</Label>
            {type === "boolean" ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="border-muted-foreground/20 focus:border-primary">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            ) : type === "json" ? (
              <Textarea
                id="fieldValue"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={'{"key": "value"}'}
                className="font-mono text-sm min-h-[100px] border-muted-foreground/20 focus:border-primary"
              />
            ) : (
              <Input
                id="fieldValue"
                type={type === "number" ? "number" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "array" ? "3, 4, 5 (comma-separated)" : "Enter default value"}
                className="border-muted-foreground/20 focus:border-primary"
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fieldComment">Comment (optional)</Label>
            <Input
              id="fieldComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Description or help text for this field"
              className="border-muted-foreground/20 focus:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            Add Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddSubsectionDialog({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd(name)
    setName("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all bg-transparent"
        >
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Nested Field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Add Nested Section
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subsectionName">Section Name</Label>
            <Input
              id="subsectionName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Contact, Settings"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="border-muted-foreground/20 focus:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            Add Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddSectionDialog({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd(name)
    setName("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-dashed border-2 hover:bg-primary/5 hover:border-primary/50 transition-all group bg-transparent"
        >
          <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
          Add New Section
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add New Section
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sectionName">Section Name</Label>
            <Input
              id="sectionName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Billing, Shipping, Payment"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="border-muted-foreground/20 focus:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            Add Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DynamicFormBuilder() {
  const [sections, setSections] = useState<FormSection[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [configInput, setConfigInput] = useState("")
  const [commentsInput, setCommentsInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectConfig | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)

  useEffect(() => {
    const projectsFromLocal = getProjects()
    setProjects(projectsFromLocal)
    if (projectsFromLocal?.length === 0) {
      window.location.href = "/projects"
    }
  }, [])

  const fetchProjectConfig = async (project: ProjectConfig) => {
    setIsLoadingProject(true)
    try {
      const response = await fetch(project.getEndpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch config for ${project.name}`)
      }
      const data = await response.json()

      // Expect data to have config and optionally comments
      const config = data.config || data
      const comments = data.comments || {}

      const { generalFields, sections: parsedSections } = parseConfigToSections(config, comments)

      const allSections: FormSection[] = []
      if (generalFields.length > 0) {
        allSections.push({
          id: "general",
          name: "General",
          fields: generalFields,
          subsections: [],
        })
      }
      allSections.push(...parsedSections)

      setSections(allSections)

      // Save to localStorage for this project
      localStorage.setItem(getStorageKeyConfig(project.id), JSON.stringify(config))
      localStorage.setItem(getStorageKeyComments(project.id), JSON.stringify(comments))
    } catch (error) {
      console.error("Error fetching project config:", error)
      enqueueSnackbar(`Failed to load config for ${project.name}. Make sure the server is running.`)
    } finally {
      setIsLoadingProject(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      fetchProjectConfig(project)
    }
  }

  useEffect(() => {
    const savedConfig = localStorage.getItem(getStorageKeyConfig(selectedProject?.id || null))
    const savedComments = localStorage.getItem(getStorageKeyComments(selectedProject?.id || null))

    let config = exampleConfig
    let comments = exampleComments

    if (savedConfig) {
      try {
        config = JSON.parse(savedConfig)
      } catch (e) {
        console.error("Failed to parse saved config", e)
      }
    }

    if (savedComments) {
      try {
        comments = JSON.parse(savedComments)
      } catch (e) {
        console.error("Failed to parse saved comments", e)
      }
    }

    const { generalFields, sections: parsedSections } = parseConfigToSections(config, comments)

    const allSections: FormSection[] = []
    if (generalFields.length > 0) {
      allSections.push({
        id: "general",
        name: "General",
        fields: generalFields,
        subsections: [],
      })
    }
    allSections.push(...parsedSections)

    setSections(allSections)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    const config = sectionsToConfig(sections)
    const comments = sectionsToComments(sections)

    localStorage.setItem(getStorageKeyConfig(selectedProject?.id || null), JSON.stringify(config))
    localStorage.setItem(getStorageKeyComments(selectedProject?.id || null), JSON.stringify(comments))
  }, [sections, isLoaded, selectedProject])

  const handleImport = () => {
    try {
      const config = JSON.parse(configInput || "{}")
      let commentData: NestedComments = {}

      if (commentsInput.trim()) {
        commentData = JSON.parse(commentsInput)
      }

      const { generalFields, sections: parsedSections } = parseConfigToSections(config, commentData)

      const allSections: FormSection[] = []
      if (generalFields.length > 0) {
        allSections.push({
          id: "general",
          name: "General",
          fields: generalFields,
          subsections: [],
        })
      }
      allSections.push(...parsedSections)

      setSections(allSections)
      setIsImportOpen(false)
      setConfigInput("")
      setCommentsInput("")
    } catch (error) {
      enqueueSnackbar("Invalid JSON format. Please check your input.")
    }
  }

  const buildJson = (): Record<string, unknown> => {
    return sectionsToConfig(sections)
  }

  const buildCommentsJson = (): NestedComments => {
    return sectionsToComments(sections)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const jsonData = buildJson()
    const commentsData = buildCommentsJson()

    try {
      const uploadUrl = selectedProject.uploadEndpoint

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({config: jsonData, comments: commentsData}),
      })

      if (response.ok) {
        enqueueSnackbar("Configuration uploaded successfully!")
      } else {
        enqueueSnackbar("Failed to upload configuration")
      }
    } catch (error) {
      console.error("Upload error:", error)
      enqueueSnackbar("Error uploading configuration. Make sure the server is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(buildJson(), null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadJson = () => {
    const jsonData = JSON.stringify(buildJson(), null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "config.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadCommentsJson = () => {
    const jsonData = JSON.stringify(buildCommentsJson(), null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "comments.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearStorage = () => {
    localStorage.removeItem(getStorageKeyConfig(selectedProject?.id || null))
    localStorage.removeItem(getStorageKeyComments(selectedProject?.id || null))

    const { generalFields, sections: parsedSections } = parseConfigToSections(exampleConfig, exampleComments)
    const allSections: FormSection[] = []
    if (generalFields.length > 0) {
      allSections.push({
        id: "general",
        name: "General",
        fields: generalFields,
        subsections: [],
      })
    }
    allSections.push(...parsedSections)
    setSections(allSections)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background opacity-98 to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SnackbarProvider />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-accent">
              <Dna className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Loom
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Configure and manage your app</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/projects">
              <Button
                variant="outline"
                className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all bg-transparent"
              >
                <Settings className="h-4 w-4 mr-2" />
                Projects
              </Button>
            </Link>

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all bg-transparent"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Import Configuration
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="configJson">Configuration JSON</Label>
                    <Textarea
                      id="configJson"
                      value={configInput}
                      onChange={(e) => setConfigInput(e.target.value)}
                      placeholder='{"CONFIG_KEY1": "value", "CONFIG_key3": {"CHILD_1": 12}}'
                      className="font-mono text-sm max-h-[150px] border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="commentsJson">Comments JSON (optional - same structure as config)</Label>
                    <Textarea
                      id="commentsJson"
                      value={commentsInput}
                      onChange={(e) => setCommentsInput(e.target.value)}
                      placeholder='{"CONFIG_KEY1": "Description", "CONFIG_key3": {"CHILD_1": "Description"}}'
                      className="font-mono text-sm max-h-[100px] border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport}>Import</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={clearStorage}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all bg-transparent"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset
            </Button>

            <Select value={selectedProject?.id || ""} onValueChange={handleProjectChange} disabled={isLoadingProject}>
              <SelectTrigger className="w-[200px] border-muted-foreground/20 focus:border-primary">
                <SelectValue placeholder={isLoadingProject ? "Loading..." : "Select project..."} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {projects.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No projects configured.
                    <br />
                    <Link href="/projects" className="text-primary hover:underline">
                      Add a project
                    </Link>
                  </div>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <FormSectionComponent sections={sections} onUpdate={setSections} />
        </div>

        <div className="mt-8 bg-gradient-to-br from-card to-card/50 rounded-xl border shadow-sm">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-wide">Raw Configuration Preview</h3>
            </div>
            <div className="flex flex-row gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="hover:bg-muted">
                {showPreview ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="hover:bg-muted">
                {copied ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
              </Button>
              <div>
                <Button variant="ghost" size="sm" onClick={downloadJson} className="hover:bg-muted">
                  <Download className="h-4 w-4 mr-1.5" />
                  Config
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadCommentsJson} className="hover:bg-muted">
                  <Download className="h-4 w-4 mr-1.5" />
                  Comments
                </Button>
              </div>
            </div>
          </div>
          {showPreview && (
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">config.json</Label>
                <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-60 tracking-widest font-mono">
                  {JSON.stringify(buildJson(), null, 2)}
                </pre>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">comments.json</Label>
                <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-60 font-mono">
                  {JSON.stringify(buildCommentsJson(), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { FormField, FormSection, FieldType };
