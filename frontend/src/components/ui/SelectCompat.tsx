"use client";

import React, { useMemo, useState } from "react";
import { UiverseSelect, UiverseSelectOption } from "@/components/ui/UiverseSelect";

/**
 * The portal's one dropdown. Takes the same props as a native <select> (value, onChange(e), <option> children,
 * className, disabled, required, id, name, title) and draws the custom dropdown from UiverseSelect.
 * Layout classes (width, margin, flex, grid span) are kept on the wrapper; look classes are dropped so every dropdown looks the same.
 */
const LAYOUT = /^(?:(?:sm|md|lg|xl|2xl):)?(?:w-|min-w-|max-w-|flex-|flex$|grow|shrink|basis-|col-span|col-start|row-span|self-|order-|m[trblxy]?-|-m[trblxy]?-|hidden$|block$|inline-block$)/;
const SMALL = /(?:^|:)(?:h-[6-8]|text-xs|text-\[1[01](?:\.\d)?px\]|py-1|py-1\.5)$/;

function flatten(children: React.ReactNode, out: UiverseSelectOption[]) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as any;
    if (child.type === React.Fragment || child.type === "optgroup") {
      flatten(props.children, out);
      return;
    }
    const text = React.Children.toArray(props.children).map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join("");
    out.push({ value: props.value !== undefined ? props.value : text, label: props.children !== undefined ? props.children : text });
  });
}

export function SelectCompat(props: React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string }) {
  const { value, defaultValue, onChange, children, className = "", disabled, required, id, name, title, style, placeholder } = props;
  const [inner, setInner] = useState<any>(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const options = useMemo(() => { const o: UiverseSelectOption[] = []; flatten(children, o); return o; }, [children]);
  const tokens = String(className).split(/\s+/).filter(Boolean);
  const wrapper = tokens.filter((t) => LAYOUT.test(t)).join(" ");
  const small = tokens.some((t) => SMALL.test(t));

  return (
    <span className={`relative ${tokens.some((t) => /(^|:)w-full$/.test(t)) ? "block" : "inline-block"} ${wrapper}`} id={id} title={title} style={style}>
      <UiverseSelect
        className="w-full"
        triggerClassName="w-full"
        size={small ? "sm" : "default"}
        disabled={disabled}
        placeholder={placeholder}
        value={current}
        options={options}
        onChange={(v: any) => {
          if (!controlled) setInner(v);
          onChange?.({ target: { value: String(v), name, id }, currentTarget: { value: String(v), name, id } } as unknown as React.ChangeEvent<HTMLSelectElement>);
        }}
      />
      {required && <input tabIndex={-1} aria-hidden="true" required value={String(current ?? "")} onChange={() => {}} className="absolute inset-0 opacity-0 pointer-events-none" />}
    </span>
  );
}

export default SelectCompat;
