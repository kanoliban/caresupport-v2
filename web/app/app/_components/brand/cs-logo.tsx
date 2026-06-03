import Image from "next/image";

type CSLogoProps = {
  size?: number;
  className?: string;
};

export function CSLogo({ size = 32, className = "" }: CSLogoProps) {
  return (
    <Image
      src="/caresupport-logo.png"
      alt="CareSupport"
      width={size}
      height={size}
      priority
      className={className}
      style={{
        width: size,
        height: size,
        filter: "var(--cs-logo-shadow)",
      }}
    />
  );
}
