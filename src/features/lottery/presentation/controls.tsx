"use client";
import { useId } from "react";
import type { UseFormReturn, FieldPath } from "react-hook-form";
import type { Project } from "../domain/model";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

export function NumberField({
  form,
  name,
  label,
  min,
  max,
  step = 1,
}: {
  form: UseFormReturn<Project>;
  name: FieldPath<Project>;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId(),
    error = form.getFieldState(name, form.formState).error;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...form.register(name, { valueAsNumber: true })}
      />
      {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
    </Field>
  );
}
export function TextField({
  form,
  name,
  label,
  maxLength = 20,
}: {
  form: UseFormReturn<Project>;
  name: FieldPath<Project>;
  label: string;
  maxLength?: number;
}) {
  const id = useId(),
    error = form.getFieldState(name, form.formState).error;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...form.register(name)}
      />
      {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
    </Field>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  description,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map(([v, text]) => (
              <SelectItem key={v} value={v}>
                {text}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
