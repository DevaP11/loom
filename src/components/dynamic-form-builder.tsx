'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronDown, Plus, Trash2, FolderPlus, Info, Send, FileJson, Upload, Copy, Check, Download, Eye, EyeOff } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

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

type CommentsMap = Record<string, string>

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

function parseConfigToSections(
  config: Record<string, unknown>,
  comments: CommentsMap,
  parentPath = "",
): { generalFields: FormField[]; sections: FormSection[] } {
  const generalFields: FormField[] = []
  const sections: FormSection[] = []

  Object.entries(config).forEach(([key, value]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nested = parseConfigToSections(value as Record<string, unknown>, comments, currentPath)
      const section: FormSection = {
        id: `section-${currentPath.replace(/\./g, "-")}`,
        name: key,
        fields: nested.generalFields,
        subsections: nested.sections,
      }
      sections.push(section)
    } else {
      const field: FormField = {
        id: `field-${currentPath.replace(/\./g, "-")}`,
        name: key,
        type: getFieldType(value),
        value: value as string | number | boolean | number[] | object,
        comment: comments[currentPath],
      }
      generalFields.push(field)
    }
  })

  return { generalFields, sections }
}

function sectionsToConfig(sections: FormSection[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  sections.forEach((section) => {
    if (section.name === "General") {
      section.fields.forEach((field) => {
        result[field.name] = formatFieldValue(field)
      })
    } else {
      const sectionData: Record<string, unknown> = {}
      section.fields.forEach((field) => {
        sectionData[field.name] = formatFieldValue(field)
      })
      if (section.subsections.length > 0) {
        const nestedData = sectionsToConfig(section.subsections)
        Object.assign(sectionData, nestedData)
      }
      result[section.name] = sectionData
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

const exampleConfig: Record<string, unknown> = {
  CONFIG_KEY1: "random_string",
  CONFIG_KEY2: true,
  CONFIG_key3: {
    CHILD_1: 12,
    CHILD_2: [3, 4, 5],
  },
  Header: {
    Type: "Invoice",
    Number: 6496721,
    DateIssued: "30/11/2018",
    DateDue: "31/12/2018",
  },
  Company: {
    Name: "Abc company",
    Tax: "",
    Contact: {
      Email: "",
      Phone: "",
    },
  },
}

const exampleComments: CommentsMap = {
  CONFIG_KEY1: "Primary configuration string",
  CONFIG_KEY2: "Enable or disable feature flag",
  "CONFIG_key3.CHILD_1": "Numeric threshold value",
  "CONFIG_key3.CHILD_2": "Array of priority levels",
  "Header.Type": "Document type (Invoice, Quote, etc.)",
  "Header.Number": "Unique document number",
  "Company.Name": "Legal company name",
  "Company.Contact.Email": "Primary contact email address",
}

const formatName = (str: string) => {
  if (str.length < 4) return str

  return str
    .replaceAll('-', '_')
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

function FormSectionComponent({
  sections,
  onUpdate,
  depth = 0,
  parentPath = "",
  commentsMap = {},
}: {
  sections: FormSection[]
  onUpdate: (sections: FormSection[]) => void
  depth?: number
  parentPath?: string
  commentsMap?: CommentsMap
}) {
  const [expandedSections, setExpandedSections] = useState<string[]>(sections.map((s) => s.id))

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

  const addField = (sectionId: string, field: Omit<FormField, "id">) => {
    onUpdate(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [...section.fields, { ...field, id: `field-${Date.now()}` }],
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

  const getFieldPath = (sectionName: string, fieldName: string): string => {
    if (sectionName === "General") return fieldName
    const basePath = parentPath ? `${parentPath}.${sectionName}` : sectionName
    return `${basePath}.${fieldName}`
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {sections.map((section) => {
          const sectionPath = parentPath ? `${parentPath}.${section.name}` : section.name
          const isExpanded = expandedSections.includes(section.id)

          return (
            <Collapsible
              key={section.id}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.id)}
            >
              <div
                className="bg-gradient-to-br from-card to-card/50 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200"
                style={{ marginLeft: depth > 0 ? `${depth * 20}px` : 0 }}
              >
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-t-xl group">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <ChevronDown
                        className={`h-4 w-4 text-primary transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    <h2 className="text-base font-semibold text-foreground">
                      {formatName(section.name)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {section.fields.length} {section.fields.length === 1 ? 'field' : 'fields'}
                    </span>
                    {depth > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this section and all its contents?')) {
                            removeSection(section.id)
                          }
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.fields.map((field) => {
                          const fieldPath = getFieldPath(section.name, field.name)
                          const comment = field.comment || commentsMap[fieldPath]

                          return (
                            <div key={field.id} className="space-y-2 group/field">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
                                    {formatName(field.name)}
                                  </Label>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">
                                    {field.type}
                                  </span>
                                  {comment && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-sm">{comment}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover/field:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                  onClick={() => {
                                    if (confirm(`Delete field "${field.name}"?`)) {
                                      removeField(section.id, field.id)
                                    }
                                  }}
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
                                  <span className="ml-3 text-sm font-medium">{field.value ? "Enabled" : "Disabled"}</span>
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
                                <Input
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
                          commentsMap={commentsMap}
                        />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
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

    onAdd({ name, type, value: parsedValue })
    setName("")
    setType("string")
    setValue("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Field
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>Add Field</Button>
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
        <Button variant="outline" size="sm" className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all">
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Add Subsection
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
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>Add Section</Button>
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
        <Button variant="outline" className="w-full border-dashed border-2 hover:bg-primary/5 hover:border-primary/50 transition-all group">
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
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>Add Section</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DynamicFormBuilder() {
  const [sections, setSections] = useState<FormSection[]>([])
  const [commentsMap, setCommentsMap] = useState<CommentsMap>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [configInput, setConfigInput] = useState("")
  const [commentsInput, setCommentsInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const config = exampleConfig
    const commentData = exampleComments
    setCommentsMap(commentData)

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
  }, [])

  const handleImport = () => {
    try {
      const config = JSON.parse(configInput || "{}")
      let commentData: CommentsMap = {}

      if (commentsInput.trim()) {
        commentData = JSON.parse(commentsInput)
      }

      setCommentsMap(commentData)
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
      alert("Invalid JSON format. Please check your input.")
    }
  }

  const buildJson = (): Record<string, unknown> => {
    return sectionsToConfig(sections)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const jsonData = buildJson()

    try {
      const response = await fetch("http://localhost:3000/config/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      })

      if (response.ok) {
        alert("Configuration uploaded successfully!")
      } else {
        alert("Failed to upload configuration")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Error uploading configuration. Make sure the server is running.")
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
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileJson className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Dynamic Form Builder
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Configure and manage your JSON data</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all">
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON
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
                    <Label htmlFor="commentsJson">Comments JSON (optional)</Label>
                    <Textarea
                      id="commentsJson"
                      value={commentsInput}
                      onChange={(e) => setCommentsInput(e.target.value)}
                      placeholder='{"CONFIG_KEY1": "Description for KEY1", "CONFIG_key3.CHILD_1": "Description"}'
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

            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <FormSectionComponent sections={sections} onUpdate={setSections} commentsMap={commentsMap} />
        </div>

        <div className="mt-8 bg-gradient-to-br from-card to-card/50 rounded-xl border shadow-sm">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">JSON Output Preview</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="hover:bg-muted"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
                {showPreview ? "Hide" : "Show"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="hover:bg-muted"
              >
                {copied ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadJson}
                className="hover:bg-muted"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
            </div>
          </div>
          {showPreview && (
            <div className="p-4">
              <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-96 font-mono">
                {JSON.stringify(buildJson(), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
