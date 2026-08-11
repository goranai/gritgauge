"use client";

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Plus, Trash2, GripVertical } from "lucide-react";

// ─── Types ───

export interface FormField<T = Record<string, unknown>> {
  name: keyof T & string;
  label: string;
  type: "text" | "number" | "email" | "password" | "url" | "textarea" | "select" | "multi-select" | "checkbox" | "radio" | "switch" | "date" | "datetime" | "file" | "color" | "range" | "hidden" | "custom";
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string; disabled?: boolean }[];
  validation?: {
    required?: string;
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    email?: string;
    url?: string;
    custom?: (value: unknown, formValues: T) => string | null;
  };
  dependsOn?: { field: keyof T & string; value: unknown };
  transform?: { input?: (value: unknown) => unknown; output?: (value: unknown) => unknown };
  width?: "full" | "half" | "third" | "quarter";
  rows?: number;
  customRender?: (props: { value: unknown; onChange: (v: unknown) => void; error?: string; field: FormField<T> }) => React.ReactNode;
}

export interface FormStep<T = Record<string, unknown>> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  fields: FormField<T>[];
  validation?: (values: Partial<T>) => Record<string, string>;
}

export interface FormConfig<T = Record<string, unknown>> {
  steps?: FormStep<T>[];
  fields?: FormField<T>[]; // For single-step forms
  onSubmit: (values: T) => Promise<void>;
  onCancel?: () => void;
  initialValues?: Partial<T>;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  showReset?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  className?: string;
  layout?: "vertical" | "horizontal";
  size?: "sm" | "md" | "lg";
}

// ─── Validation Engine ───

function validateField<T>(
  field: FormField<T>,
  value: unknown,
  formValues: T
): string | null {
  if (field.validation?.required && (!value || (typeof value === "string" && !value.trim()))) {
    return field.validation.required || `${field.label} is required`;
  }

  if (field.validation?.min && typeof value === "number" && value < field.validation.min.value) {
    return field.validation.min.message;
  }

  if (field.validation?.max && typeof value === "number" && value > field.validation.max.value) {
    return field.validation.max.message;
  }

  if (field.validation?.minLength && typeof value === "string" && value.length < field.validation.minLength.value) {
    return field.validation.minLength.message;
  }

  if (field.validation?.maxLength && typeof value === "string" && value.length > field.validation.maxLength.value) {
    return field.validation.maxLength.message;
  }

  if (field.validation?.pattern && typeof value === "string" && !field.validation.pattern.value.test(value)) {
    return field.validation.pattern.message;
  }

  if (field.validation?.email && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return field.validation.email || "Invalid email address";
  }

  if (field.validation?.url && typeof value === "string" && !/^https?:\/\/.+/.test(value)) {
    return field.validation.url || "Invalid URL";
  }

  if (field.validation?.custom) {
    return field.validation.custom(value, formValues);
  }

  return null;
}

function validateStep<T>(
  step: FormStep<T>,
  values: Partial<T>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of step.fields) {
    const value = values[field.name];
    const error = validateField(field, value, values as T);
    if (error) errors[field.name] = error;
  }

  if (step.validation) {
    const stepErrors = step.validation(values);
    Object.assign(errors, stepErrors);
  }

  return errors;
}

// ─── Field Renderer ───

function renderField<T>(
  field: FormField<T>,
  value: unknown,
  onChange: (name: string, value: unknown) => void,
  onBlur: (name: string) => void,
  error?: string,
  touched?: boolean
): React.ReactNode {
  const commonProps = {
    id: field.name,
    name: field.name,
    disabled: field.disabled,
    readOnly: field.readOnly,
    required: field.required,
    placeholder: field.placeholder,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${field.name}-error` : undefined,
    onBlur: () => onBlur(field.name),
  };

  if (field.customRender) {
    return field.customRender({ value, onChange: (v) => onChange(field.name, v), error, field });
  }

  const widthClass = {
    full: "col-span-full",
    half: "col-span-1",
    third: "col-span-1",
    quarter: "col-span-1",
  }[field.width || "full"];

  const wrapper = (children: React.ReactNode) => (
    <div key={field.name} className={field.width && field.width !== "full" ? "" : widthClass}>
      <label htmlFor={field.name} className="block text-sm font-medium text-surface-300 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {field.helpText && !error && (
        <p className="mt-1 text-xs text-surface-500">{field.helpText}</p>
      )}
      {error && touched && (
        <p id={`${field.name}-error`} className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );

  switch (field.type) {
    case "text":
    case "email":
    case "password":
    case "url":
    case "color":
      return wrapper(
        <input
          type={field.type}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={cn(
            "w-full bg-surface-800 border rounded-lg px-3 py-2.5 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 transition-all",
            error && touched ? "border-red-500 focus:ring-red-500/50" : "border-surface-700 focus:ring-brand-500/50"
          )}
          {...commonProps}
        />
      );

    case "number":
    case "range":
      return wrapper(
        <input
          type={field.type}
          value={(value as number) ?? ""}
          min={field.validation?.min?.value}
          max={field.validation?.max?.value}
          onChange={(e) => onChange(field.name, e.target.type === "range" ? Number(e.target.value) : e.target.value)}
          className={cn(
            "w-full bg-surface-800 border rounded-lg px-3 py-2.5 text-surface-100 focus:outline-none focus:ring-2 transition-all",
            field.type === "range" && "px-1",
            error && touched ? "border-red-500 focus:ring-red-500/50" : "border-surface-700 focus:ring-brand-500/50"
          )}
          {...commonProps}
        />
      );

    case "textarea":
      return wrapper(
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          rows={field.rows || 4}
          className={cn(
            "w-full bg-surface-800 border rounded-lg px-3 py-2.5 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 transition-all resize-vertical",
            error && touched ? "border-red-500 focus:ring-red-500/50" : "border-surface-700 focus:ring-brand-500/50"
          )}
          {...commonProps}
        />
      );

    case "select":
      return wrapper(
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={cn(
            "w-full bg-surface-800 border rounded-lg px-3 py-2.5 text-surface-100 focus:outline-none focus:ring-2 transition-all",
            error && touched ? "border-red-500 focus:ring-red-500/50" : "border-surface-700 focus:ring-brand-500/50"
          )}
          {...commonProps}
        >
          <option value="">{field.placeholder || `Select ${field.label}...`}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "multi-select":
      return wrapper(
        <div className="space-y-1.5 max-h-40 overflow-y-auto bg-surface-800 border border-surface-700 rounded-lg p-2">
          {field.options?.map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt.value) : false;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors",
                  selected ? "bg-brand-500/10 text-brand-400" : "text-surface-300 hover:bg-surface-700"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const arr = Array.isArray(value) ? [...value] : [];
                    if (selected) {
                      onChange(field.name, arr.filter((v) => v !== opt.value));
                    } else {
                      onChange(field.name, [...arr, opt.value]);
                    }
                  }}
                  disabled={opt.disabled}
                  className="rounded accent-brand-500"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );

    case "checkbox":
      return (
        <div key={field.name} className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(field.name, e.target.checked)}
            className="mt-1 rounded accent-brand-500"
            {...commonProps}
          />
          <div>
            <label htmlFor={field.name} className="text-sm font-medium text-surface-300">
              {field.label}
            </label>
            {field.helpText && <p className="text-xs text-surface-500 mt-0.5">{field.helpText}</p>}
          </div>
        </div>
      );

    case "switch":
      return (
        <div key={field.name} className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-surface-300">{field.label}</label>
            {field.helpText && <p className="text-xs text-surface-500">{field.helpText}</p>}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={(value as boolean) ?? false}
            onClick={() => onChange(field.name, !value)}
            disabled={field.disabled}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              value ? "bg-brand-600" : "bg-surface-700",
              field.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                value ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      );

    case "radio":
      return wrapper(
        <div className="space-y-2">
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer"
            >
              <input
                type="radio"
                name={field.name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(field.name, opt.value)}
                disabled={opt.disabled}
                className="accent-brand-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      );

    case "date":
    case "datetime":
      return wrapper(
        <input
          type={field.type === "datetime" ? "datetime-local" : "date"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={cn(
            "w-full bg-surface-800 border rounded-lg px-3 py-2.5 text-surface-100 focus:outline-none focus:ring-2 transition-all",
            error && touched ? "border-red-500 focus:ring-red-500/50" : "border-surface-700 focus:ring-brand-500/50"
          )}
          {...commonProps}
        />
      );

    default:
      return wrapper(
        <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(field.name, e.target.value)}
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          {...commonProps}
        />
      );
  }
}

// ─── Main Form Component ───

export function Form<T extends Record<string, unknown>>({
  steps,
  fields,
  onSubmit,
  onCancel,
  initialValues = {} as Partial<T>,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  loading = false,
  disabled = false,
  showReset = false,
  validateOnChange = false,
  validateOnBlur = true,
  className,
  layout = "vertical",
  size = "md",
}: FormConfig<T>) {
  const isMultiStep = !!steps && steps.length > 0;
  const formSteps = steps || [{ title: "Form", fields: fields || [] }];

  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentStepConfig = formSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === formSteps.length - 1;

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      setSubmitError(null);

      if (validateOnChange) {
        const field = currentStepConfig.fields.find((f) => f.name === name);
        if (field) {
          const error = validateField(field, value, values as T);
          setErrors((prev) => {
            const next = { ...prev };
            if (error) next[name] = error;
            else delete next[name];
            return next;
          });
        }
      }
    },
    [validateOnChange, currentStepConfig, values]
  );

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (validateOnBlur) {
        const field = currentStepConfig.fields.find((f) => f.name === name);
        if (field) {
          const error = validateField(field, values[name], values as T);
          setErrors((prev) => {
            const next = { ...prev };
            if (error) next[name] = error;
            else delete next[name];
            return next;
          });
        }
      }
    },
    [validateOnBlur, currentStepConfig, values]
  );

  const validateCurrentStep = useCallback((): boolean => {
    const stepErrors = validateStep(currentStepConfig, values);
    setErrors(stepErrors);
    setTouched((prev) => {
      const next = { ...prev };
      currentStepConfig.fields.forEach((f) => (next[f.name] = true));
      return next;
    });
    return Object.keys(stepErrors).length === 0;
  }, [currentStepConfig, values]);

  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      setCurrentStep((s) => Math.min(s + 1, formSteps.length - 1));
    }
  }, [validateCurrentStep, formSteps.length]);

  const handlePrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      setSubmitError(null);

      // Validate all steps
      let allValid = true;
      const allErrors: Record<string, string> = {};

      for (const step of formSteps) {
        const stepErrors = validateStep(step, values);
        Object.assign(allErrors, stepErrors);
        if (Object.keys(stepErrors).length > 0) allValid = false;
      }

      setErrors(allErrors);
      if (!allValid) {
        setTouched((prev) => {
          const next = { ...prev };
          formSteps.forEach((s) => s.fields.forEach((f) => (next[f.name] = true)));
          return next;
        });
        return;
      }

      try {
        await onSubmit(values as T);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Submission failed");
      }
    },
    [values, onSubmit, formSteps]
  );

  const handleReset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitted(false);
    setSubmitError(null);
    setCurrentStep(0);
  }, [initialValues]);

  const progressPercent = isMultiStep
    ? ((currentStep + 1) / formSteps.length) * 100
    : 100;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)} noValidate>
      {/* Progress bar */}
      {isMultiStep && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {formSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                    i < currentStep
                      ? "bg-brand-600 text-white"
                      : i === currentStep
                      ? "bg-brand-600 text-white ring-4 ring-brand-500/20"
                      : "bg-surface-800 text-surface-500"
                  )}
                >
                  {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:inline",
                    i <= currentStep ? "text-white font-medium" : "text-surface-500"
                  )}
                >
                  {step.title}
                </span>
                {i < formSteps.length - 1 && (
                  <div
                    className={cn(
                      "w-8 sm:w-16 h-0.5 hidden sm:block",
                      i < currentStep ? "bg-brand-600" : "bg-surface-800"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-surface-800 rounded-full h-1.5">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {currentStepConfig.description && (
            <p className="text-surface-400 text-sm mt-3">{currentStepConfig.description}</p>
          )}
        </div>
      )}

      {/* Fields */}
      <div className={cn("grid gap-4", layout === "horizontal" && "grid-cols-2")}>
        {currentStepConfig.fields
          .filter((f) => {
            if (!f.dependsOn) return true;
            return values[f.dependsOn.field] === f.dependsOn.value;
          })
          .map((field) =>
            renderField(
              field,
              values[field.name],
              handleChange,
              handleBlur,
              errors[field.name],
              touched[field.name]
            )
          )}
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-800">
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
              {cancelLabel}
            </button>
          )}
          {showReset && (
            <button type="button" onClick={handleReset} className="btn-secondary" disabled={loading}>
              Reset
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {isMultiStep && !isFirstStep && (
            <button type="button" onClick={handlePrev} className="btn-secondary flex items-center gap-1" disabled={loading}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {isMultiStep && !isLastStep ? (
            <button type="button" onClick={handleNext} className="btn-primary flex items-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || disabled}
              className="btn-primary flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitted && !loading ? "Submitted!" : submitLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

// ─── Field Array (Dynamic List) ───

export function FieldArray<T>({
  name,
  label,
  values,
  onChange,
  renderField,
  addLabel = "Add Item",
  minItems = 0,
  maxItems = 100,
  defaultValue,
}: {
  name: string;
  label: string;
  values: T[];
  onChange: (values: T[]) => void;
  renderField: (index: number, value: T, onChange: (value: T) => void) => React.ReactNode;
  addLabel?: string;
  minItems?: number;
  maxItems?: number;
  defaultValue?: T;
}) {
  const add = () => {
    if (values.length >= maxItems) return;
    onChange([...values, defaultValue || ({} as T)]);
  };

  const remove = (index: number) => {
    if (values.length <= minItems) return;
    onChange(values.filter((_, i) => i !== index));
  };

  const update = (index: number, value: T) => {
    onChange(values.map((v, i) => (i === index ? value : v)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-surface-300">{label}</label>
        <button
          type="button"
          onClick={add}
          disabled={values.length >= maxItems}
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>
      {values.map((value, index) => (
        <div key={index} className="flex items-start gap-2 bg-surface-800/50 rounded-lg p-3 border border-surface-700">
          <div className="text-surface-600 cursor-grab mt-2">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1">
            {renderField(index, value, (v) => update(index, v))}
          </div>
          {values.length > minItems && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-surface-500 hover:text-red-400 mt-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
