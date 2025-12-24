"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Edit, FolderOpen, ArrowLeft, Save, ArrowRight } from "lucide-react"
import Link from "next/link"

export interface ProjectConfig {
  id: string
  name: string
  getEndpoint: string
  uploadEndpoint: string
}

const PROJECTS_STORAGE_KEY = "dynamic-form-projects"

export function getProjects(): ProjectConfig[] {
  if (typeof window === "undefined") return []
  const saved = localStorage.getItem(PROJECTS_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }
  return []
}

export function saveProjects(projects: ProjectConfig[]) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
}

export function ProjectConfigPage() {
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    getEndpoint: "",
    uploadEndpoint: "",
  })

  useEffect(() => {
    setProjects(getProjects())
  }, [])

  const handleSave = () => {
    if (!formData.name.trim() || !formData.getEndpoint.trim() || !formData.uploadEndpoint.trim()) {
      alert("Please fill in all fields")
      return
    }

    let updatedProjects: ProjectConfig[]

    if (editingProject) {
      updatedProjects = projects.map((p) =>
        p.id === editingProject.id
          ? {
              ...p,
              name: formData.name,
              getEndpoint: formData.getEndpoint,
              uploadEndpoint: formData.uploadEndpoint,
            }
          : p,
      )
    } else {
      const newProject: ProjectConfig = {
        id: `project-${Date.now()}`,
        name: formData.name,
        getEndpoint: formData.getEndpoint,
        uploadEndpoint: formData.uploadEndpoint,
      }
      updatedProjects = [...projects, newProject]
    }

    setProjects(updatedProjects)
    saveProjects(updatedProjects)
    setFormData({ name: "", getEndpoint: "", uploadEndpoint: "" })
    setIsAddOpen(false)
    setEditingProject(null)
  }

  const handleDelete = (id: string) => {
    const updatedProjects = projects.filter((p) => p.id !== id)
    setProjects(updatedProjects)
    saveProjects(updatedProjects)
  }

  const openEditDialog = (project: ProjectConfig) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      getEndpoint: project.getEndpoint,
      uploadEndpoint: project.uploadEndpoint,
    })
    setIsAddOpen(true)
  }

  const closeDialog = () => {
    setIsAddOpen(false)
    setEditingProject(null)
    setFormData({ name: "", getEndpoint: "", uploadEndpoint: "" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Project Configuration
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your projects and API endpoints</p>
            </div>
          </div>

          <Dialog open={isAddOpen} onOpenChange={(open) => (open ? setIsAddOpen(true) : closeDialog())}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editingProject ? (
                    <>
                      <Edit className="h-5 w-5 text-primary" />
                      Edit Project
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-primary" />
                      Add New Project
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., My Project"
                    className="border-muted-foreground/20 focus:border-primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="getEndpoint">GET Endpoint</Label>
                  <Input
                    id="getEndpoint"
                    value={formData.getEndpoint}
                    onChange={(e) => setFormData({ ...formData, getEndpoint: e.target.value })}
                    placeholder="http://localhost:3000/config/project1"
                    className="border-muted-foreground/20 focus:border-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">URL to fetch configuration from</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="uploadEndpoint">Upload Endpoint</Label>
                  <Input
                    id="uploadEndpoint"
                    value={formData.uploadEndpoint}
                    onChange={(e) => setFormData({ ...formData, uploadEndpoint: e.target.value })}
                    placeholder="http://localhost:3000/config/project1/upload"
                    className="border-muted-foreground/20 focus:border-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">URL to submit configuration to</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProject ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first project to get started</p>
              <Button onClick={() => setIsAddOpen(true)} variant="outline" className="bg-primary/90 text-white p-2 hover:bg-primary/80 hover:text-white mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => openEditDialog(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Project ID: {project.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">GET Endpoint</span>
                    <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono break-all">
                      {project.getEndpoint}
                    </code>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Upload Endpoint</span>
                    <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono break-all">
                      {project.uploadEndpoint}
                    </code>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-row justify-end">
                  <Button onClick={() => {
                    window.location.href = "/"
                  }} variant="outline" className="bg-primary/90 text-white p-2 hover:bg-primary/80 hover:text-white mb-4">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Start Configuring
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
