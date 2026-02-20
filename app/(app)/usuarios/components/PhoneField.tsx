import { Controller as ControllerForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Control, FieldValues, Path } from "react-hook-form"
import { maskPhone } from "@/lib/utils/maskPhone"

type PhoneFieldProps<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
}

export function PhoneField<T extends FieldValues>({
  name,
  control,
  label = "Whatsapp",
  placeholder = "(27) 91234-5678",
}: PhoneFieldProps<T>) {
  return (
    <ControllerForm
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>

          <Input
            id={name}
            placeholder={placeholder}
            value={(field.value as string) ?? ""}
            onChange={(e) => field.onChange(maskPhone(e.target.value))}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
          />

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
