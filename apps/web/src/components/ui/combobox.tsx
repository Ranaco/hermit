"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxItem {
  value: string
  label: string
  description?: string
  keywords?: string[]
}

interface ComboboxProps {
  items: ComboboxItem[]
  value?: string
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  onValueChange: (value: string) => void
  className?: string
  triggerClassName?: string
}

function Combobox({
  items,
  value,
  placeholder,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  onValueChange,
  className,
  triggerClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  )

  React.useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-[10px] border-input bg-background px-3 text-left text-sm font-medium text-foreground transition focus-visible:ring-2 focus-visible:ring-ring",
            !selectedItem && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[var(--radix-popover-trigger-width)] p-2", className)}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command>
          <CommandInput
            ref={searchInputRef}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={`${item.label} ${item.value} ${(item.keywords || []).join(" ")}`}
                  onSelect={() => {
                    onValueChange(item.value)
                    setOpen(false)
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {item.label}
                    </div>
                    {item.description ? (
                      <div className="mt-0.5 break-words text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary transition-opacity",
                      item.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox }
