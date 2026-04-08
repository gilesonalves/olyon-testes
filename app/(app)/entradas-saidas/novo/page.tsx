"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller as ControllerForm, useForm } from "react-hook-form"
import { type Resolver } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import HeaderPage from "@/components/headerPage"
import { Controller } from "../controllers"
import { formSchema, type FormValues } from "../schemas"
import {
  CATEGORIES_EXPENSES_ARRAY,
  CATEGORIES_INCOME_ARRAY,
} from "@/constants/finance-categories"

const CATEGORY_SUGGESTIONS_LIMIT = 8

function normalizeCategoryQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

export default function ItemNovo() {
  const router = useRouter()
  const { createEntry } = Controller({ autoLoad: false })
  const categoryFieldRef = useRef<HTMLDivElement | null>(null)
  const categoryListboxId = useId()
  const [isCategoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(0)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      category: "",
      amount: 0,
      description: "",
      dueDate: "",
      transactionDate: new Date().toISOString().slice(0, 10),
      type: "EXPENSE",
    },
  })
  const selectedType = form.watch("type")
  const categoryValue = form.watch("category")
  const categorySuggestions =
    selectedType === "INCOME" ? CATEGORIES_INCOME_ARRAY : CATEGORIES_EXPENSES_ARRAY
  const filteredCategorySuggestions = useMemo(() => {
    const normalizedQuery = normalizeCategoryQuery(categoryValue ?? "")

    if (!normalizedQuery) {
      return categorySuggestions.slice(0, CATEGORY_SUGGESTIONS_LIMIT)
    }

    return categorySuggestions
      .filter((category) =>
        normalizeCategoryQuery(category.label).includes(normalizedQuery)
      )
      .slice(0, CATEGORY_SUGGESTIONS_LIMIT)
  }, [categorySuggestions, categoryValue])
  const hasCategoryQuery = Boolean(categoryValue?.trim())
  const shouldShowCategoryDropdown =
    isCategoryDropdownOpen &&
    (filteredCategorySuggestions.length > 0 || hasCategoryQuery)

  useEffect(() => {
    if (selectedType === "INCOME") {
      form.setValue("dueDate", "", { shouldDirty: true, shouldValidate: true })
    }
  }, [form, selectedType])

  useEffect(() => {
    setHighlightedCategoryIndex(0)
  }, [filteredCategorySuggestions.length, selectedType])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        categoryFieldRef.current &&
        event.target instanceof Node &&
        !categoryFieldRef.current.contains(event.target)
      ) {
        setCategoryDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  function selectCategorySuggestion(
    value: string,
    onChange: (value: string) => void
  ) {
    onChange(value)
    form.clearErrors("category")
    setCategoryDropdownOpen(false)
    setHighlightedCategoryIndex(0)
  }

  const onSubmit = async (data: FormValues) => {
    const result = await createEntry({
      type: data.type,
      amount: Number(data.amount),
      category: data.category.trim(),
      description: data.description?.trim() ? data.description.trim() : null,
      transactionDate: data.transactionDate,
      dueDate: data.type === "EXPENSE" && data.dueDate?.trim() ? data.dueDate : null,
    })

    if (!result.ok) {
      form.setError("root", { message: result.error })
      return
    }

    toast.success("Lançamento criado com sucesso!")
    router.push("/entradas-saidas")
    router.refresh()
  }

  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-normal">Novo lançamento</span>
        </div>
      </HeaderPage>

      <div className="bg-white px-6 py-7">
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <FieldGroup className="mb-6">
          <ControllerForm
            name="type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Escolha o tipo</FieldLabel>

                <RadioGroup className="flex" onValueChange={field.onChange} value={field.value}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INCOME" id="finance-income" />
                    <Label htmlFor="finance-income">Entrada</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXPENSE" id="finance-expense" />
                    <Label htmlFor="finance-expense">Saída</Label>
                  </div>
                </RadioGroup>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldGroup className="grid gap-5 md:grid-cols-2">
          <ControllerForm
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="amount">Valor</FieldLabel>
                <Input
                  {...field}
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={fieldState.invalid}
                  placeholder="0,00"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="category"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="category">Categoria</FieldLabel>
                <div ref={categoryFieldRef} className="relative">
                  <Input
                    {...field}
                    id="category"
                    type="text"
                    aria-invalid={fieldState.invalid}
                    aria-autocomplete="list"
                    aria-controls={categoryListboxId}
                    aria-expanded={shouldShowCategoryDropdown}
                    aria-activedescendant={
                      shouldShowCategoryDropdown &&
                      filteredCategorySuggestions[highlightedCategoryIndex]
                        ? `${categoryListboxId}-${highlightedCategoryIndex}`
                        : undefined
                    }
                    role="combobox"
                    autoComplete="off"
                    placeholder={
                      selectedType === "INCOME"
                        ? "Ex.: Servicos prestados, Vendas, Bonus"
                        : "Ex.: Fornecedor local, Material de limpeza, Taxa da maquininha"
                    }
                    onFocus={() => {
                      setCategoryDropdownOpen(true)
                    }}
                    onBlur={() => {
                      field.onBlur()
                      setTimeout(() => {
                        if (
                          categoryFieldRef.current &&
                          !categoryFieldRef.current.contains(document.activeElement)
                        ) {
                          setCategoryDropdownOpen(false)
                        }
                      }, 0)
                    }}
                    onChange={(event) => {
                      field.onChange(event)
                      setCategoryDropdownOpen(true)
                      setHighlightedCategoryIndex(0)
                    }}
                    onKeyDown={(event) => {
                      if (!filteredCategorySuggestions.length) {
                        if (event.key === "Escape") {
                          setCategoryDropdownOpen(false)
                        }

                        return
                      }

                      if (event.key === "ArrowDown") {
                        event.preventDefault()
                        setCategoryDropdownOpen(true)
                        setHighlightedCategoryIndex((current) =>
                          current >= filteredCategorySuggestions.length - 1
                            ? 0
                            : current + 1
                        )
                        return
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault()
                        setCategoryDropdownOpen(true)
                        setHighlightedCategoryIndex((current) =>
                          current <= 0
                            ? filteredCategorySuggestions.length - 1
                            : current - 1
                        )
                        return
                      }

                      if (event.key === "Enter" && shouldShowCategoryDropdown) {
                        const highlightedCategory =
                          filteredCategorySuggestions[highlightedCategoryIndex]

                        if (highlightedCategory) {
                          event.preventDefault()
                          selectCategorySuggestion(
                            highlightedCategory.label,
                            field.onChange
                          )
                        }

                        return
                      }

                      if (event.key === "Escape") {
                        setCategoryDropdownOpen(false)
                      }
                    }}
                  />

                  {shouldShowCategoryDropdown ? (
                    <div
                      id={categoryListboxId}
                      role="listbox"
                      className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                    >
                      {filteredCategorySuggestions.length > 0 ? (
                        <div className="max-h-56 overflow-y-auto p-1.5">
                          {filteredCategorySuggestions.map((category, index) => {
                            const isHighlighted = index === highlightedCategoryIndex
                            const isSelected =
                              normalizeCategoryQuery(field.value ?? "") ===
                              normalizeCategoryQuery(category.label)

                            return (
                              <button
                                key={`${selectedType}-${category._id}`}
                                id={`${categoryListboxId}-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                }}
                                onClick={() => {
                                  selectCategorySuggestion(
                                    category.label,
                                    field.onChange
                                  )
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                  isHighlighted
                                    ? "bg-slate-100 text-slate-900"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className="truncate">{category.label}</span>
                                {isSelected ? (
                                  <span className="ml-3 text-xs font-medium text-slate-500">
                                    atual
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="px-3 py-3 text-sm text-slate-500">
                          Nenhuma sugestao encontrada. Voce pode digitar uma categoria personalizada.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

               
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControllerForm
            name="transactionDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="transactionDate">Data</FieldLabel>
                <Input {...field} id="transactionDate" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {selectedType === "EXPENSE" ? (
            <ControllerForm
              name="dueDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="dueDate">Vencimento</FieldLabel>
                  <Input {...field} id="dueDate" type="date" aria-invalid={fieldState.invalid} value={field.value ?? ""} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ) : null}
        </FieldGroup>

        <FieldGroup className="my-6">
          <ControllerForm
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="description">Observações</FieldLabel>
                <Textarea
                  {...field}
                  id="description"
                  aria-invalid={fieldState.invalid}
                  placeholder="Descreva o lançamento"
                  value={field.value ?? ""}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {form.formState.errors.root?.message ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {form.formState.errors.root.message}
          </div>
        ) : null}

        <div className="text-right">
          <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        </form>
      </div>
    </>
  )
}
