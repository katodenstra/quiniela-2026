import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ButtonVariant = "ghost" | "primary" | "danger" | "success";

type ButtonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
  style?: CSSProperties;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function getVariantStyle(
  variant: ButtonVariant,
  disabled?: boolean,
): CSSProperties {
  const base: CSSProperties = {
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    padding: "0.72rem 1rem",
    borderRadius: "999px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    transition:
      "background 140ms ease, border-color 140ms ease, opacity 140ms ease",
    opacity: disabled ? 0.55 : 1,
    background: "rgba(255,255,255,0.04)",
  };

  if (variant === "primary") {
    return {
      ...base,
      background: "rgba(58, 112, 226, 0.20)",
      borderColor: "rgba(58, 112, 226, 0.45)",
    };
  }

  if (variant === "danger") {
    return {
      ...base,
      background: "rgba(236, 45, 48, 0.14)",
      borderColor: "rgba(236, 45, 48, 0.24)",
    };
  }

  if (variant === "success") {
    return {
      ...base,
      background: "rgba(12, 157, 97, 0.18)",
      borderColor: "rgba(12, 157, 97, 0.24)",
    };
  }

  return base;
}

function Button({
  variant = "ghost",
  children,
  style,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        ...getVariantStyle(variant, disabled),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
