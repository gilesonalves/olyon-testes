import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const SERVICES = [
  { id: "corte", label: "Corte de cabelo" },
  { id: "barba", label: "Barba" },
  { id: "sobrancelha", label: "Sobrancelha" },
]

type ServicesCheckboxGroupProps = {
  value: string[]
  onChange: (value: string[]) => void
}

export function ServicesCheckboxGroup({
  value,
  onChange,
}: ServicesCheckboxGroupProps) {
  const toggleService = (service: string) => {
    if (value.includes(service)) {
      onChange(value.filter((item) => item !== service))
    } else {
      onChange([...value, service])
    }
  }

  return (
    <div className="flex gap-6 mt-6">
      {SERVICES.map((service) => (
        <div key={service.id} className="flex items-center gap-3">
          <Checkbox
            id={service.id}
            checked={value.includes(service.id)}
            onCheckedChange={() => toggleService(service.id)}
          />
          <Label htmlFor={service.id}>{service.label}</Label>
        </div>
      ))}
    </div>
  )
}
