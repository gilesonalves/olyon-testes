"use client"
import { Switch } from "@/components/ui/switch";
import { Controller } from "./controllers";
import { Controller as ControllerForm } from "react-hook-form"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"


export default function HorariosDeAtendimento() {
  const { form, onSubmit } = Controller()
  return (
    <div className="bg-white px-6 py-7 w-[487px]">
      <div className="flex justify-between items-center pb-6">
        <p>
          Agendamentos
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <FieldGroup >
          <div className="space-y-3">

            <div className="flex items-center gap-3 text-sm text-gray-800">

              <ControllerForm
                name="type"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="habilitar"
                        value={field.value}
                        onCheckedChange={(value) =>
                          field.onChange(value ? "enabled" : "disabled")
                        }
                      />
                      <span className="w-24 text-primary font-semibold">
                        Domingo
                      </span>
                    </div>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field>
                <div className="flex items-center gap-3">
                  <ControllerForm
                    name="timeStart"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <>
                        <select {...field} className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                          <option value="06:00">6:00</option>
                          <option value="07:00">7:00</option>
                          <option value="08:00">8:00</option>
                        </select>

                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </>
                    )}
                  />
                  <span>-</span>
                  <ControllerForm
                    name="timeEnd"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <>
                        <select {...field} className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                          <option value="06:00">6:00</option>
                          <option value="07:00">7:00</option>
                          <option value="08:00">8:00</option>
                        </select>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </>
                    )}
                  />
                  <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
                    +
                  </button>
                </div>
              </Field>


              {/* <ControllerForm
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex gap-3">
                      <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                        <option>6:00</option>
                        <option>7:00</option>
                        <option>8:00</option>
                      </select>
                      <span>-</span>
                      <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                        <option>6:00</option>
                        <option>7:00</option>
                        <option>8:00</option>
                      </select>
                      <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
                        +
                      </button>
                    </div>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              /> */}



            </div>
            <div className="flex justify-end items-center gap-3">
              <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                <option>6:00</option>
                <option>7:00</option>
                <option>8:00</option>
              </select>
              <span>-</span>
              <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
                <option>6:00</option>
                <option>7:00</option>
                <option>8:00</option>
              </select>
              <button className="cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V8" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12.2475 1.75015C12.5127 1.48493 12.8724 1.33594 13.2475 1.33594C13.6225 1.33594 13.9822 1.48493 14.2475 1.75015C14.5127 2.01537 14.6617 2.37508 14.6617 2.75015C14.6617 3.12522 14.5127 3.48493 14.2475 3.75015L8.23879 9.75948C8.08049 9.91765 7.88493 10.0334 7.67012 10.0962L5.75479 10.6562C5.69743 10.6729 5.63662 10.6739 5.57873 10.6591C5.52084 10.6442 5.46801 10.6141 5.42576 10.5719C5.3835 10.5296 5.35338 10.4768 5.33855 10.4189C5.32372 10.361 5.32473 10.3002 5.34146 10.2428L5.90146 8.32748C5.96448 8.11285 6.08048 7.91752 6.23879 7.75948L12.2475 1.75015Z" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.66406 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.33594 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12.6693 4V13.3333C12.6693 13.687 12.5288 14.0261 12.2787 14.2761C12.0287 14.5262 11.6896 14.6667 11.3359 14.6667H4.66927C4.31565 14.6667 3.97651 14.5262 3.72646 14.2761C3.47641 14.0261 3.33594 13.687 3.33594 13.3333V4" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 4H14" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.33594 4.0026V2.66927C5.33594 2.31565 5.47641 1.97651 5.72646 1.72646C5.97651 1.47641 6.31565 1.33594 6.66927 1.33594H9.33594C9.68956 1.33594 10.0287 1.47641 10.2787 1.72646C10.5288 1.97651 10.6693 2.31565 10.6693 2.66927V4.0026" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
              <Switch id="habilitar" />

            </div>
            <span className="w-24">Segunda</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <span>-</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
              +
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
              <Switch id="habilitar" />

            </div>
            <span className="w-24">Terça</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <span>-</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
              +
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
              <Switch id="habilitar" />

            </div>
            <span className="w-24">Quarta</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <span>-</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
              +
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
              <Switch id="habilitar" />

            </div>
            <span className="w-24">Quinta</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <span>-</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
              +
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
              <Switch id="habilitar" />

            </div>
            <span className="w-24">Sexta</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <span>-</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
              +
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-800">
            <div className="flex items-center space-x-2">
              <Switch id="habilitar" />

            </div>
            <span className="w-24">Sábado</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <span>-</span>
            <select className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
              <option>6:00</option>
              <option>7:00</option>
              <option>8:00</option>
            </select>
            <button type="button" className="flex items-center justify-center text-base text-gray-700 font-bold cursor-pointer">
              +
            </button>
          </div>

        </FieldGroup>

        <div className="space-y-3 pt-10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Horários bloqueados
            </h3>
            <button type="button" className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              + Adicionar
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <div className="space-y-1">
                <span className="block text-gray-800">00/00/0000</span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  10:00 - 10:30
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <button className="cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V8" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12.2475 1.75015C12.5127 1.48493 12.8724 1.33594 13.2475 1.33594C13.6225 1.33594 13.9822 1.48493 14.2475 1.75015C14.5127 2.01537 14.6617 2.37508 14.6617 2.75015C14.6617 3.12522 14.5127 3.48493 14.2475 3.75015L8.23879 9.75948C8.08049 9.91765 7.88493 10.0334 7.67012 10.0962L5.75479 10.6562C5.69743 10.6729 5.63662 10.6739 5.57873 10.6591C5.52084 10.6442 5.46801 10.6141 5.42576 10.5719C5.3835 10.5296 5.35338 10.4768 5.33855 10.4189C5.32372 10.361 5.32473 10.3002 5.34146 10.2428L5.90146 8.32748C5.96448 8.11285 6.08048 7.91752 6.23879 7.75948L12.2475 1.75015Z" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66406 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.33594 7.33594V11.3359" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12.6693 4V13.3333C12.6693 13.687 12.5288 14.0261 12.2787 14.2761C12.0287 14.5262 11.6896 14.6667 11.3359 14.6667H4.66927C4.31565 14.6667 3.97651 14.5262 3.72646 14.2761C3.47641 14.0261 3.33594 13.687 3.33594 13.3333V4" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 4H14" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.33594 4.0026V2.66927C5.33594 2.31565 5.47641 1.97651 5.72646 1.72646C5.97651 1.47641 6.31565 1.33594 6.66927 1.33594H9.33594C9.68956 1.33594 10.0287 1.47641 10.2787 1.72646C10.5288 1.97651 10.6693 2.31565 10.6693 2.66927V4.0026" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
