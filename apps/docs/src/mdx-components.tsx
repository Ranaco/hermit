import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Callout } from "@/components/callout";
import { ArchitectureDiagram } from "@/components/architecture-diagram";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", ...props }) => (
      <Link
        href={href}
        {...props}
        className={`text-[#8ab4ff] underline decoration-white/12 underline-offset-4 ${props.className || ""}`}
      />
    ),
    Callout,
    ArchitectureDiagram,
    ...components,
  };
}
