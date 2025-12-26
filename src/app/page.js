'use client'
import { DynamicFormBuilder } from "@/components/dynamic-form-builder"
import { LinePath } from "@/components/line-path"
import { motion, useScroll } from "framer-motion";

export default function Home() {
  const { scrollYProgress } = useScroll();
  return (
    <main className="min-h-screen p-6 bg-stone-100">
      <LinePath
        className="absolute top-0 right-25 z-0"
        scrollYProgress={scrollYProgress}
      />
      <div className="relative z-10">
        <DynamicFormBuilder />
      </div>
    </main>
  )
}
