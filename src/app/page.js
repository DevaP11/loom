'use client'
import { DynamicFormBuilder } from "@/components/dynamic-form-builder"
import { LinePath } from "@/components/line-path"
import { motion, useScroll } from "framer-motion";

export default function Home() {
  const { scrollYProgress } = useScroll();
  return (
    <main className="min-h-screen p-6 bg-stone-100 dark:bg-black">
      <LinePath
        className="absolute top-0 left-40 2xl:left-140 z-0"
        scrollYProgress={scrollYProgress}
      />
      <div className="relative z-10">
        <DynamicFormBuilder />
      </div>
    </main>
  )
}
