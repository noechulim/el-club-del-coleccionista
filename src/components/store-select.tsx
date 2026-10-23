"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & { label: string };
type Choice = { value: string; label: string; disabled: boolean };

function textContent(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child)).join("");
}

function choicesFrom(children: ReactNode): Choice[] {
  return Children.toArray(children).flatMap((child): Choice[] => {
    if (!isValidElement<{ children?: ReactNode; value?: string; disabled?: boolean }>(child)) return [];
    if (child.type === Fragment) return choicesFrom(child.props.children);
    if (child.type !== "option") return [];
    const label = textContent(child.props.children);
    return [{ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) }];
  });
}

// Keep a real select for FormData, required validation and existing onChange handlers.
// The visible combobox and its portaled list never invoke the operating system menu.
export function StoreSelect({ label, children, value, defaultValue, disabled, onChange, className, ...props }: Props) {
  const choices = choicesFrom(children);
  const resetValue = String(defaultValue ?? choices[0]?.value ?? "");
  const [localValue, setLocalValue] = useState(String(defaultValue ?? choices[0]?.value ?? ""));
  const selected = String(value ?? localValue);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const root = useRef<HTMLSpanElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const id = useId();
  const expanded = open && !disabled;

  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node) && !list.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnScroll(event: Event) {
      if (!list.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, id]);

  useEffect(() => {
    const form = native.current?.form;
    function reset() { setLocalValue(resetValue); setInvalid(false); setOpen(false); }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [resetValue]);

  function show() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(280, Math.max(below, above), choices.length * 44 + 12);
    const upward = below < Math.min(height, 180) && above > below;
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: upward ? rect.top - height - 6 : rect.bottom + 6, width: Math.min(rect.width, window.innerWidth - 16), maxHeight: height });
    const index = choices.findIndex((option) => option.value === selected && !option.disabled);
    setActive(index >= 0 ? index : Math.max(0, choices.findIndex((option) => !option.disabled)));
    setOpen(true);
  }

  function choose(index: number) {
    const option = choices[index];
    if (!option || option.disabled || !native.current) return;
    native.current.value = option.value;
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
    setInvalid(false);
    setOpen(false);
    trigger.current?.focus();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab" || event.key === "Escape") { setOpen(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!expanded) { show(); return; }
      if (event.key === "Enter" || event.key === " ") { choose(active); return; }
      const enabled = choices.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
      const current = enabled.indexOf(active);
      const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : Math.max(0, Math.min(enabled.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
      if (enabled[next] !== undefined) setActive(enabled[next]);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = event.timeStamp;
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLocaleLowerCase("es"), at: now };
      const index = choices.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase("es").startsWith(typed.current.text));
      if (!expanded) show();
      if (index >= 0) setActive(index);
    }
  }

  return <span className="store-select" ref={root}>
    <select {...props} ref={native} className="store-select-native" tabIndex={-1} aria-hidden="true" disabled={disabled} value={selected}
      onFocus={() => trigger.current?.focus({ preventScroll: true })}
      onInvalid={(event) => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); }}
      onChange={(event) => { setLocalValue(event.target.value); setInvalid(false); onChange?.(event); }}>{children}</select>
    <button ref={trigger} type="button" className={`store-select-trigger ${className ?? ""}`} role="combobox" aria-label={label}
      aria-expanded={expanded} aria-controls={expanded ? id : undefined} aria-haspopup="listbox" aria-activedescendant={expanded ? `${id}-${active}` : undefined}
      aria-required={props.required} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : props["aria-describedby"]} disabled={disabled}
      onClick={() => expanded ? setOpen(false) : show()} onKeyDown={keyDown} onBlur={() => setOpen(false)}>
      <span>{choices.find((option) => option.value === selected)?.label ?? "Selecciona una opción"}</span><span aria-hidden="true">⌄</span>
    </button>
    {invalid && <span id={`${id}-error`} className="store-select-error" role="alert">Selecciona una opción.</span>}
    {expanded && createPortal(<div ref={list} id={id} role="listbox" aria-label={label} className="store-select-menu" style={position} onPointerDown={(event) => event.preventDefault()}>
      {choices.map((option, index) => <div key={`${option.value}-${index}`} id={`${id}-${index}`} role="option" aria-selected={option.value === selected} aria-disabled={option.disabled || undefined}
        className={`store-select-option${index === active ? " is-active" : ""}`} onPointerMove={() => !option.disabled && setActive(index)} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === selected && <span aria-hidden="true">✓</span>}
      </div>)}
    </div>, document.body)}
  </span>;
}
