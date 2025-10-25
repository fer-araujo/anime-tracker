"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  Wand2,
  SlidersHorizontal,
  History,
  Cpu,
  FolderPlus,
  PlayCircle,
  ChevronRight,
} from "lucide-react";

/**
 * Comfy Studio — Artefact Flow (All Workflows + LoRA Wizard)
 * - A) Studio: Text→Image, Text/Image→Video, Upscale Image, Upscale Video
 * - B) Train LoRA Wizard: 4 steps
 * - Tri-mode (Dark / Light / System) + header nav between Studio and Wizard
 *
 * Integration notes:
 *  - handleRun: call Modal/Comfy inference with {workflow, prompt, steps, cfg, seed, inputImage, inputVideo}
 *  - handleTrain: call Modal function for training with {dataset, epochs, lr, gpu}
 */

// THEME
const THEMES = {
  dark: {
    bg: "#0D0E10",
    canvas: "#121216",
    panel: "rgba(255,255,255,0.06)",
    border: "#2A2B31",
    text: "#EAEAEA",
    textMuted: "#9CA3AF",
    mint: "#8BE9C0",
    coral: "#F57D7D",
    lilac: "#D5C4F4",
    shadow: "0 10px 40px rgba(0,0,0,0.35)",
  },
  light: {
    bg: "#F7F7F9",
    canvas: "#FFFFFF",
    panel: "rgba(255,255,255,0.82)",
    border: "#E4E4E8",
    text: "#1A1A1A",
    textMuted: "#6B7280",
    mint: "#8BE9C0",
    coral: "#F57D7D",
    lilac: "#C9B7F6",
    shadow: "0 10px 40px rgba(0,0,0,0.06)",
  },
};
const useSystemDark = () => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const u = () => setIsDark(mq.matches);
    u();
    mq.addEventListener?.("change", u);
    return () => mq.removeEventListener?.("change", u);
  }, []);
  return isDark;
};
type ThemeSelectorProps = {
  theme: string;
  setTheme: (theme: string) => void;
  colors: typeof THEMES.dark;
};

function ThemeSelector({ theme, setTheme, colors }: ThemeSelectorProps) {
  const Btn = ({
    v,
    icon: Icon,
    label,
  }: {
    v: string;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={() => setTheme(v)}
      className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition"
      style={{
        border: `1px solid ${colors.border}`,
        background: theme === v ? colors.panel : "transparent",
        color: colors.text,
        boxShadow: theme === v ? colors.shadow : "none",
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
      {theme === v && (
        <motion.span
          layoutId="themeGlow"
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: `0 0 0 2px ${colors.mint}55, 0 8px 20px ${colors.mint}33`,
          }}
        />
      )}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <Btn v="dark" icon={Moon} label="Dark" />
      <Btn v="light" icon={Sun} label="Light" />
      <Btn v="system" icon={Monitor} label="System" />
    </div>
  );
}

const Glass = ({
  colors,
  className = "",
  children,
}: {
  colors: typeof THEMES.dark;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={"rounded-3xl " + className}
    style={{
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
      backdropFilter: "saturate(180%) blur(20px)",
    }}
  >
    {children}
  </div>
);
const Chip = ({
  colors,
  children,
}: {
  colors: typeof THEMES.dark;
  children: React.ReactNode;
}) => (
  <button
    className="px-3 py-1.5 rounded-full text-xs"
    style={{
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      color: colors.text,
    }}
  >
    {children}
  </button>
);

// ---------- A) STUDIO (with all workflows) ----------
function Studio({
  colors,
  setView,
}: {
  colors: typeof THEMES.dark;
  setView: (view: string) => void;
}) {
  const [workflow, setWorkflow] = useState("t2i"); // 't2i'|'i2v'|'up_img'|'up_vid'
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState(30);
  const [cfg, setCfg] = useState(8);
  const [seed, setSeed] = useState(1049390051);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputVideoName, setInputVideoName] = useState<string | null>(null);

  const handleRun = async () => {
    setRendering(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    const demo =
      workflow === "t2i" || workflow === "i2v"
        ? "https://images.unsplash.com/photo-1520975922284-8b456906c813?q=80&w=1200&auto=format&fit=crop"
        : "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1200&auto=format&fit=crop";
    setResult(demo);
    setRendering(false);
  };

  const WorkflowChip = ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => (
    <button
      onClick={() => setWorkflow(id)}
      className="relative px-3 py-2 rounded-xl text-sm"
      style={{
        border: `1px solid ${colors.border}`,
        background: workflow === id ? colors.panel : "transparent",
        color: colors.text,
      }}
    >
      {label}
      {workflow === id && (
        <motion.span
          layoutId="wfGlow"
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: `0 0 0 2px ${colors.mint}55, 0 8px 20px ${colors.mint}33`,
          }}
        />
      )}
    </button>
  );

  const LeftExtras = () => {
    if (workflow === "i2v" || workflow === "up_img")
      return (
        <div className="space-y-2">
          <div className="text-xs" style={{ color: colors.textMuted }}>
            {workflow === "i2v"
              ? "Optional starting image"
              : "Image to upscale"}
          </div>
          <div
            className="rounded-2xl p-4 grid place-items-center text-xs"
            style={{
              background: colors.canvas,
              border: `1px solid ${colors.border}`,
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = URL.createObjectURL(f);
                setInputImage(url);
              }}
            />
            {inputImage && (
              <img
                src={inputImage}
                alt="input"
                className="mt-3 w-full rounded-xl object-cover"
              />
            )}
          </div>
        </div>
      );
    if (workflow === "up_vid" || workflow === "i2v")
      return (
        <div className="space-y-2">
          <div className="text-xs" style={{ color: colors.textMuted }}>
            {workflow === "i2v" ? "Target video settings" : "Video to upscale"}
          </div>
          <div
            className="rounded-2xl p-4 grid gap-3"
            style={{
              background: colors.canvas,
              border: `1px solid ${colors.border}`,
            }}
          >
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setInputVideoName(f ? f.name : null);
              }}
            />
            {inputVideoName && (
              <div className="text-xs" style={{ color: colors.textMuted }}>
                Selected: {inputVideoName}
              </div>
            )}
            {workflow === "i2v" && (
              <>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Duration (s)
                </label>
                <input
                  type="range"
                  min={2}
                  max={12}
                  defaultValue={6}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  FPS
                </label>
                <input
                  type="range"
                  min={8}
                  max={30}
                  defaultValue={18}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </>
            )}
          </div>
        </div>
      );
    return null;
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 grid gap-8 xl:grid-cols-[min(560px,40vw),1fr,min(380px,26vw)]">
      {/* Left: workflow + inputs */}
      <div className="space-y-4 self-start">
        <div className="flex flex-wrap gap-2">
          <WorkflowChip id="t2i" label="Text→Image" />
          <WorkflowChip id="i2v" label="Text/Image→Video" />
          <WorkflowChip id="up_img" label="Upscale Image" />
          <WorkflowChip id="up_vid" label="Upscale Video" />
        </div>
        <Glass colors={colors} className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon size={16} style={{ color: colors.mint }} />
            <h3 className="font-medium">
              {workflow === "t2i"
                ? "Prompt"
                : workflow === "i2v"
                ? "Prompt / Inputs"
                : workflow === "up_img"
                ? "Upscale Image"
                : "Upscale Video"}
            </h3>
          </div>
          {(workflow === "t2i" || workflow === "i2v") && (
            <textarea
              placeholder={
                workflow === "t2i"
                  ? "Describe your vision…"
                  : "Describe the motion / scene…"
              }
              className="w-full resize-none rounded-2xl p-4 text-sm outline-none"
              rows={workflow === "t2i" ? 6 : 4}
              style={{
                background: colors.canvas,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {(workflow === "up_img"
              ? ["x2", "x4", "x6", "Sharpen", "Denoise"]
              : [
                  "Cinematic",
                  "Soft Light",
                  "Anime Painterly",
                  "35mm",
                  "Ultra Clean",
                ]
            ).map((c) => (
              <Chip key={c} colors={colors}>
                {c}
              </Chip>
            ))}
          </div>
          <LeftExtras />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleRun}
              className="rounded-2xl py-3 text-sm font-medium"
              style={{
                background: colors.mint,
                color: "#0B0B0B",
                boxShadow: `0 10px 30px ${colors.mint}55`,
              }}
            >
              <Wand2 size={16} className="inline mr-2" />{" "}
              {rendering
                ? "Working…"
                : workflow === "t2i"
                ? "Generate"
                : workflow === "i2v"
                ? "Synthesize"
                : "Upscale"}
            </button>
            <button
              onClick={() => setView("train")}
              className="rounded-2xl py-3 text-sm font-medium"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.panel,
                color: colors.text,
              }}
            >
              Train LoRA
            </button>
          </div>
        </Glass>
      </div>

      {/* Center: Canvas/Player */}
      <Glass colors={colors} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm" style={{ color: colors.textMuted }}>
            {workflow === "up_vid" || workflow === "i2v" ? "Player" : "Result"}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Chip colors={colors}>Compare A/B</Chip>
            <Chip colors={colors}>Open</Chip>
          </div>
        </div>
        <div
          className="rounded-[32px] overflow-hidden border"
          style={{ borderColor: colors.border, background: colors.canvas }}
        >
          <div className="aspect-[16/9] grid place-items-center relative">
            <AnimatePresence initial={false}>
              {rendering && (
                <motion.div
                  key="ldr"
                  className="absolute inset-0 grid place-items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: `linear-gradient(180deg, ${colors.panel}, transparent)`,
                  }}
                >
                  <div
                    className="flex items-center gap-2 text-sm"
                    style={{ color: colors.text }}
                  >
                    <Wand2 size={16} style={{ color: colors.mint }} />
                    {workflow === "up_img" || workflow === "up_vid"
                      ? "Upscaling…"
                      : "Rendering…"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {result ? (
                <motion.img
                  key={result}
                  src={result}
                  alt="Result"
                  className="h-full w-full object-cover"
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.8 }}
                />
              ) : (
                !rendering && (
                  <div className="text-sm" style={{ color: colors.textMuted }}>
                    Your{" "}
                    {workflow === "up_vid" || workflow === "i2v"
                      ? "video"
                      : "artwork"}{" "}
                    will appear here.
                  </div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>
      </Glass>

      {/* Right: Params/History */}
      <Glass colors={colors} className="p-6 space-y-6 self-start">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} style={{ color: colors.mint }} />
          <h3 className="font-medium">Params</h3>
        </div>
        <div className="space-y-5">
          {(workflow === "t2i" || workflow === "i2v") && (
            <>
              <div>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Steps
                </label>
                <input
                  type="range"
                  min={4}
                  max={60}
                  step={1}
                  defaultValue={30}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  CFG
                </label>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={0.5}
                  defaultValue={8}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Seed
                </label>
                <input
                  type="range"
                  min={0}
                  max={999999999}
                  step={1}
                  defaultValue={1049390051}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
            </>
          )}
          {(workflow === "up_img" || workflow === "up_vid") && (
            <>
              <div>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Scale
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  defaultValue={2}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Denoise
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={15}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Sharpen
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={20}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
            </>
          )}
        </div>
        <div
          className="flex items-center gap-2 pt-2 border-t"
          style={{ borderColor: colors.border }}
        >
          <History size={16} style={{ color: colors.lilac }} />
          <span className="text-sm">History</span>
        </div>
        <div className="text-xs" style={{ color: colors.textMuted }}>
          No items yet
        </div>
      </Glass>
    </main>
  );
}

// ---------- B) TRAIN LORA WIZARD ----------
function TrainWizard({
  colors,
  setView,
}: {
  colors: typeof THEMES.dark;
  setView: (view: string) => void;
}) {
  const [step, setStep] = useState(1);
  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const [dataset, setDataset] = useState<File[]>([]);
  const [epochs, setEpochs] = useState(6);
  const [lr, setLr] = useState(0.0002);
  const [gpu, setGpu] = useState("A10G");
  const [training, setTraining] = useState(false);
  const costEstimate = useMemo(() => {
    const rate = gpu === "A10G" ? 0.9 : gpu === "L4" ? 1.2 : 2.6;
    const hours = Math.max(0.25, epochs * 0.15);
    return (rate * hours).toFixed(2);
  }, [epochs, gpu]);
  const handleFiles = (files: Iterable<File> | ArrayLike<File> | null) => {
    if (!files) return;
    setDataset((prev) => [...prev, ...Array.from(files)]);
  };
  const handleTrain = async () => {
    setTraining(true);
    await new Promise((r) => setTimeout(r, 1800));
    setTraining(false);
    setView("create");
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 grid gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu size={18} style={{ color: colors.mint }} />
          <h3 className="text-lg font-medium">Train LoRA</h3>
        </div>
        <button
          onClick={() => setView("create")}
          className="text-sm"
          style={{ color: colors.textMuted }}
        >
          Back to Studio
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="px-3 py-1.5 rounded-full text-xs"
            style={{
              background: i === step ? colors.mint : colors.panel,
              color: i === step ? "#0B0B0B" : colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            Step {i}
          </div>
        ))}
      </div>
      <Glass colors={colors} className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="text-sm" style={{ color: colors.textMuted }}>
                Upload a curated dataset (10–50 images). JPG/PNG, 512–2048px.
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="grid place-items-center rounded-2xl border-dashed border-2 p-10"
                style={{ borderColor: colors.border, background: colors.panel }}
              >
                <FolderPlus size={24} style={{ color: colors.mint }} />
                <div
                  className="mt-2 text-xs"
                  style={{ color: colors.textMuted }}
                >
                  Drag & drop or click to upload
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="mt-3 text-xs"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              {!!dataset.length && (
                <div className="grid grid-cols-4 gap-3">
                  {dataset.slice(0, 8).map((f, i) => (
                    <div
                      key={i}
                      className="rounded-xl border text-xs p-2"
                      style={{
                        borderColor: colors.border,
                        color: colors.textMuted,
                      }}
                    >
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <div className="space-y-4">
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Epochs: {epochs}
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
                <label className="text-xs" style={{ color: colors.textMuted }}>
                  Learning Rate: {lr}
                </label>
                <input
                  type="range"
                  min={0.00005}
                  max={0.001}
                  step={0.00005}
                  value={lr}
                  onChange={(e) => setLr(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: colors.mint }}
                />
              </div>
              <div className="space-y-4">
                <div className="text-sm" style={{ color: colors.textMuted }}>
                  Tips
                </div>
                <ul
                  className="list-disc pl-6 text-sm"
                  style={{ color: colors.text }}
                >
                  <li>
                    Start conservative (fewer epochs) to avoid overfitting.
                  </li>
                  <li>
                    Prefer consistent framing and lighting in your dataset.
                  </li>
                  <li>Use captioning if available for better conditioning.</li>
                </ul>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid sm:grid-cols-3 gap-4"
            >
              {[
                { id: "A10G", vRAM: "24GB", rate: "$0.90/hr" },
                { id: "L4", vRAM: "24GB", rate: "$1.20/hr" },
                { id: "A100", vRAM: "40GB", rate: "$2.60/hr" },
              ].map((card) => (
                <button
                  key={card.id}
                  onClick={() => setGpu(card.id)}
                  className="rounded-2xl p-4 text-left"
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: gpu === card.id ? colors.mint : colors.panel,
                    color: gpu === card.id ? "#0B0B0B" : colors.text,
                  }}
                >
                  <div className="font-medium">{card.id}</div>
                  <div
                    className="text-xs"
                    style={{
                      color: gpu === card.id ? "#0B0B0B" : colors.textMuted,
                    }}
                  >
                    {card.vRAM} · {card.rate}
                  </div>
                </button>
              ))}
              <div
                className="sm:col-span-3 text-sm"
                style={{ color: colors.textMuted }}
              >
                Estimated cost:{" "}
                <span style={{ color: colors.text }}>${costEstimate}</span>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="text-sm" style={{ color: colors.textMuted }}>
                Review
              </div>
              <div className="grid gap-3 text-sm">
                <div>
                  Images: <b>{dataset.length}</b>
                </div>
                <div>
                  Epochs: <b>{epochs}</b>
                </div>
                <div>
                  Learning Rate: <b>{lr}</b>
                </div>
                <div>
                  GPU: <b>{gpu}</b>
                </div>
                <div>
                  Est. Cost: <b>${costEstimate}</b>
                </div>
              </div>
              <button
                onClick={handleTrain}
                className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2"
                style={{
                  background: colors.mint,
                  color: "#0B0B0B",
                  boxShadow: `0 10px 30px ${colors.mint}55`,
                }}
              >
                <PlayCircle size={16} />{" "}
                {training ? "Starting…" : "Start Training"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2 rounded-xl text-sm"
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            color: colors.text,
            opacity: step === 1 ? 0.6 : 1,
          }}
        >
          Back
        </button>
        <div className="text-xs" style={{ color: colors.textMuted }}>
          Step {step} of 4
        </div>
        <button
          onClick={() => setStep((s) => Math.min(4, s + 1))}
          disabled={step === 4}
          className="px-4 py-2 rounded-xl text-sm"
          style={{
            background: colors.mint,
            color: "#0B0B0B",
            boxShadow: `0 10px 20px ${colors.mint}55`,
            opacity: step === 4 ? 0.6 : 1,
          }}
        >
          Next <ChevronRight className="inline ml-1" size={14} />
        </button>
      </div>
    </main>
  );
}

// ---------- ROOT APP ----------
export default function ComfyStudioApp() {
  const systemDark = useSystemDark();
  const [theme, setTheme] = useState("system");
  const effective = useMemo(
    () => (theme === "system" ? (systemDark ? "dark" : "light") : theme),
    [theme, systemDark]
  );
  const colors = effective === "dark" ? THEMES.dark : THEMES.light;
  const [view, setView] = useState("create");
  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        minHeight: "100dvh",
        transition: "background 250ms ease, color 250ms ease",
      }}
    >
      <header className="sticky top-0 z-20">
        <div
          className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 grid place-items-center rounded-2xl"
              style={{
                background: colors.panel,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Sparkles size={16} style={{ color: colors.mint }} />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-lg">Comfy Studio</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>
                {view === "create"
                  ? "Artefact Flow · Studio"
                  : "Artefact Lab · Train LoRA"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex items-center gap-2">
              {[
                { id: "create", label: "Create" },
                { id: "train", label: "Train LoRA" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className="relative px-3 py-2 rounded-xl text-sm"
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: view === tab.id ? colors.panel : "transparent",
                    color: colors.text,
                  }}
                >
                  {tab.label}
                  {view === tab.id && (
                    <motion.span
                      layoutId="navGlow"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        boxShadow: `0 0 0 2px ${colors.mint}55, 0 8px 20px ${colors.mint}33`,
                      }}
                    />
                  )}
                </button>
              ))}
            </nav>
            <ThemeSelector theme={theme} setTheme={setTheme} colors={colors} />
          </div>
        </div>
      </header>
      <AnimatePresence mode="wait">
        {view === "create" ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Studio colors={colors} setView={setView} />
          </motion.div>
        ) : (
          <motion.div
            key="train"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <TrainWizard colors={colors} setView={setView} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 grid place-items-center">
        <div
          className="pointer-events-auto w-[min(960px,92vw)] rounded-2xl px-5 py-3 flex items-center justify-between"
          style={{
            background: THEMES[effective as "dark" | "light"].panel,
            border: `1px solid ${THEMES[effective as "dark" | "light"].border}`,
            boxShadow: THEMES[effective as "dark" | "light"].shadow,
            backdropFilter: "saturate(180%) blur(16px)",
          }}
        >
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: THEMES[effective as "dark" | "light"].textMuted }}
          >
            <Sparkles size={14} style={{ color: THEMES[effective as "dark" | "light"].mint }} />
            {view === "create" ? "Ready • Studio" : "Wizard • Train LoRA"}
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <Chip colors={THEMES[effective as "dark" | "light"]}>Docs</Chip>
            <Chip colors={THEMES[effective as "dark" | "light"]}>Shortcuts</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}
