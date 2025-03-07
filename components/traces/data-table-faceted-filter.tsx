"use client"

import type * as React from "react"
import { useEffect, useState } from "react"
import { CheckIcon, PlusCircledIcon } from "@radix-ui/react-icons"
import type { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { getFilterOptions } from "@/lib/api"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options?: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  onFilterChange: (value: string | null) => void
  selectedValue?: string
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options: initialOptions,
  onFilterChange,
  selectedValue,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [options, setOptions] = useState(initialOptions || [])
  const [loading, setLoading] = useState(!initialOptions)

  useEffect(() => {
    if (!initialOptions && column) {
      const fetchOptions = async () => {
        setLoading(true)
        try {
          const values = await getFilterOptions(column.id)
          setOptions(
            values.map((value: string) => ({
              label: String(value),
              value: String(value),
            })),
          )
        } catch (error) {
          console.error(`Error fetching options for ${column.id}:`, error)
        } finally {
          setLoading(false)
        }
      }

      fetchOptions()
    }
  }, [column, initialOptions])

  const selectedOption = options?.find((option) => option.value === selectedValue)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircledIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedOption ? (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selectedOption.label}
              </Badge>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Loading options...</div>
              ) : options.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No options available</div>
              ) : (
                options.map((option) => {
                  const isSelected = selectedValue === option.value
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        if (isSelected) {
                          onFilterChange(null)
                        } else {
                          onFilterChange(option.value)
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <CheckIcon className={cn("h-4 w-4")} />
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  )
                })
              )}
            </CommandGroup>
            {selectedValue ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onFilterChange(null)} className="justify-center text-center">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

