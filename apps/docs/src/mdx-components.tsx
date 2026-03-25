import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { isValidElement, type ReactElement } from "react";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { Callout } from "@/components/callout";
import { CodeBlock } from "@/components/code-block";

function Heading({
  as: Tag,
  id,
  className = "",
  children,
  ...props
}: {
  as: "h2" | "h3";
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag id={id} className={`group ${className}`} {...props}>
      {id ? (
        <a href={`#${id}`} className="inline-flex items-center gap-2 no-underline">
          <span>{children}</span>
          <span className="text-[var(--docs-soft)] opacity-0 transition-opacity group-hover:opacity-100">#</span>
        </a>
      ) : (
        children
      )}
    </Tag>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", ...props }) => (
      <Link
        href={href}
        {...props}
        className={`underline decoration-[var(--docs-border-strong)] underline-offset-4 ${props.className || ""}`}
      />
    ),
    h2: ({ id, className, children, ...props }) => (
      <Heading as="h2" id={id} className={className} {...props}>
        {children}
      </Heading>
    ),
    h3: ({ id, className, children, ...props }) => (
      <Heading as="h3" id={id} className={className} {...props}>
        {children}
      </Heading>
    ),
    pre: (props) => {
      const child = props.children;

      if (isValidElement(child)) {
        const codeChild = child as ReactElement<{
          children?: string;
          className?: string;
        }>;

        if (typeof codeChild.props.children === "string") {
        const language =
          typeof codeChild.props.className === "string"
            ? codeChild.props.className.replace("language-", "")
            : undefined;

          return <CodeBlock code={codeChild.props.children} language={language} />;
        }
      }

      return <pre {...props} />;
    },
    Callout,
    ArchitectureDiagram,
    ...components,
  };
}
