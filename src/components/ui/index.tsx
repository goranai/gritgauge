"use client";

import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import React from "react";

// ─── Button ───

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children, variant = "primary", size = "md", loading, icon, className, disabled, ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white hover:shadow-lg hover:shadow-brand-500/25",
    secondary: "bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-surface-800 text-surface-300",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Input ───

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-surface-300 text-sm mb-1.5">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full bg-surface-800 border rounded-lg px-4 py-3 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 transition-all duration-200",
            icon && "pl-11",
            error ? "border-red-500 focus:ring-red-500/50" : "border-surface-700 focus:ring-brand-500/50 focus:border-brand-500/50",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
    </div>
  );
}

// ─── Badge ───

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  const variants = {
    default: "bg-surface-800 text-surface-300 border-surface-700",
    success: "bg-green-500/10 text-green-400 border-green-500/30",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    danger: "bg-red-500/10 text-red-400 border-red-500/30",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  };
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span className={cn("inline-flex items-center border rounded-full font-medium", variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

// ─── Alert ───

interface AlertProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  className?: string;
}

export function Alert({ children, variant = "info", title, className }: AlertProps) {
  const icons = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
  const styles = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
    success: "border-green-500/30 bg-green-500/5 text-green-300",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300",
    error: "border-red-500/30 bg-red-500/5 text-red-300",
  };
  const Icon = icons[variant];

  return (
    <div className={cn("border rounded-lg p-4 flex gap-3", styles[variant], className)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

// ─── Modal ───

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  if (!open) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full mx-4 animate-slide-up", sizes[size])}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-surface-400 hover:text-white">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Tabs ───

interface TabsProps {
  tabs: { key: string; label: string; count?: number; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-surface-800 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
            activeTab === tab.key
              ? "border-brand-500 text-white"
              : "border-transparent text-surface-400 hover:text-surface-200"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className="text-surface-500 text-xs">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton ───

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

// ─── Toggle ───

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {label && <span className="text-sm text-surface-300">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-surface-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </label>
  );
}

// ─── Dropdown ───

interface DropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Dropdown({ options, value, onChange, placeholder, className }: DropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "bg-surface-800 border border-surface-700 rounded-lg px-4 py-2.5 text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ─── Tooltip ───

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-surface-800 text-surface-200 text-xs rounded-lg border border-surface-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {content}
      </div>
    </div>
  );
}
