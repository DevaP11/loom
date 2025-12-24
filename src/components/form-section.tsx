"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronDown, Plus, Trash2, FolderPlus, Info } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import type {
  FormSection as FormSectionType,
  FormField,
  FieldType,
} from "@/components/dynamic-form-builder"

interface FormSectionProps {
  sections: FormSectionType[]
  onUpdate: (sections: FormSectionType[]) => void
  depth?: number
  parentPath?: string
  commentsMap?: any
}

const formatName = (str) => {
  return str
    .replaceAll('-', '_')
    .split('_')
    ?.map(part => {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    ?.join(' ')
    ?.trim()
}

export function FormSectionComponent({
  sections,
  onUpdate,
  depth = 0,
  parentPath = "",
  commentsMap = {},
}: FormSectionProps) {
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
    const newSubsection: FormSectionType = {
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

  const updateSubsections = (sectionId: string, updatedSubsections: FormSectionType[]) => {
    onUpdate(
      sections.map((section) => (section.id === sectionId ? { ...section, subsections: updatedSubsections } : section)),
    )
  }

  const addSection = (sectionName: string) => {
    const newSection: FormSectionType = {
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
    if (sectionName === "General") {
      return fieldName
    }
    const basePath = parentPath ? `${parentPath}.${sectionName}` : sectionName
    return `${basePath}.${fieldName}`
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionPath = parentPath ? `${parentPath}.${section.name}` : section.name

          return (
            <Collapsible
              key={section.id}
              open={expandedSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <div className="bg-card rounded-lg border" style={{ marginLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${
                        expandedSections.includes(section.id) ? "rotate-180" : ""
                      }`}
                    />
                    {formatName(section.name)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{section.fields.length} field(s)</span>
                    {depth > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSection(section.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {section.fields.map((field) => {
                        const fieldPath = getFieldPath(section.name, field.name)
                        const comment = field.comment || commentsMap[fieldPath]

                        return (
                          <div key={field.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Label htmlFor={field.id} className="text-sm text-muted-foreground">
                                  {formatName(field.name)}
                                  <span className="ml-1 text-xs opacity-60">({field.type})</span>
                                </Label>
                                {comment && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{comment}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => removeField(section.id, field.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {field.type === "boolean" ? (
                              <div className="flex items-center h-10 px-3 border rounded-md bg-background">
                                <Switch
                                  id={field.id}
                                  checked={Boolean(field.value)}
                                  onCheckedChange={(checked) => updateField(section.id, field.id, checked)}
                                />
                                <span className="ml-2 text-sm">{field.value ? "true" : "false"}</span>
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
                                className="bg-background"
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
                                className="bg-background font-mono text-xs min-h-[100px]"
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
                                className="bg-background"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <AddFieldDialog onAdd={(field) => addField(section.id, field)} />
                      <AddSubsectionDialog onAdd={(name) => addSubsection(section.id, name)} />
                    </div>

                    {section.subsections.length > 0 && (
                      <div className="pt-4 border-t">
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

function AddFieldDialog({
  onAdd,
}: {
  onAdd: (field: Omit<FormField, "id">) => void
}) {
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

    onAdd({
      name,
      type,
      value: parsedValue,
    })
    setName("")
    setType("string")
    setValue("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Field</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fieldName">Field Name</Label>
            <Input
              id="fieldName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CONFIG_KEY, Email, Amount"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fieldType">Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="array">Array</SelectItem>
                <SelectItem value="json">JSON (Complex Object)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fieldValue">Default Value</Label>
            {type === "boolean" ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
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
                className="font-mono text-sm min-h-[100px]"
              />
            ) : (
              <Input
                id="fieldValue"
                type={type === "number" ? "number" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "array" ? "3, 4, 5 (comma-separated)" : "Enter default value"}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAdd}>Add Field</Button>
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
        <Button variant="outline" size="sm">
          <FolderPlus className="h-4 w-4 mr-1" />
          Add Subsection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Nested Section</DialogTitle>
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAdd}>Add Section</Button>
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
        <Button variant="secondary" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAdd}>Add Section</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
