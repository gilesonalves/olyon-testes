"use client"
import HeaderPage from "@/components/headerPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Controller as ControllerForm } from "react-hook-form"
import { Controller } from "./controllers";




export default function Servicos() {
  const { form, onSubmit } = Controller()
  return (
    <>
      <HeaderPage>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold">Tipos de Eventos</span>

          <Dialog>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogTrigger asChild>
                <Button variant="primary">Novo item</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="pb-4">
                  <DialogTitle>Novo tipo de evento</DialogTitle>
                </DialogHeader>
                <FieldGroup>
                  <ControllerForm
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="name">
                          Nome
                        </FieldLabel>
                        <Input
                          {...field}
                          id="name"
                          type="text"
                          aria-invalid={fieldState.invalid}
                          placeholder="Digite aqui o nome do evento"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <ControllerForm
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <div className="flex justify-between items-center">
                          <FieldLabel htmlFor="description">
                            Descrição
                          </FieldLabel>
                        </div>
                        <Textarea
                          {...field}
                          id="description"
                          aria-invalid={fieldState.invalid}
                          placeholder="Digite aqui a descrição do evento"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>
                <div>
                  <Servicos title="Serviços" />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DialogClose>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>
        </div>
      </HeaderPage>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-medium text-gray-900">
              Corte de cabelo simples
            </p>
            <svg width="51" height="21" viewBox="0 0 51 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="51" height="20" rx="4" fill="#E5E6EA" />
              <path d="M23.6307 15.1193C23.1307 15.1193 22.6804 15.0199 22.2798 14.821C21.8793 14.6222 21.5582 14.3494 21.3168 14.0028C21.0753 13.6562 20.9432 13.2614 20.9205 12.8182H21.9432C21.983 13.2131 22.1619 13.5398 22.4801 13.7983C22.8011 14.054 23.1847 14.1818 23.6307 14.1818C23.9886 14.1818 24.3068 14.098 24.5852 13.9304C24.8665 13.7628 25.0866 13.5327 25.2457 13.2401C25.4077 12.9446 25.4886 12.6108 25.4886 12.2386C25.4886 11.858 25.4048 11.5185 25.2372 11.2202C25.0724 10.919 24.8452 10.6818 24.5554 10.5085C24.2656 10.3352 23.9347 10.2472 23.5625 10.2443C23.2955 10.2415 23.0213 10.2827 22.7401 10.3679C22.4588 10.4503 22.2273 10.5568 22.0455 10.6875L21.0568 10.5682L21.5852 6.27273H26.1193V7.21023H22.4716L22.1648 9.78409H22.2159C22.3949 9.64205 22.6193 9.52415 22.8892 9.4304C23.1591 9.33665 23.4403 9.28977 23.733 9.28977C24.267 9.28977 24.7429 9.41761 25.1605 9.6733C25.581 9.92614 25.9105 10.2727 26.1491 10.7131C26.3906 11.1534 26.5114 11.6562 26.5114 12.2216C26.5114 12.7784 26.3864 13.2756 26.1364 13.7131C25.8892 14.1477 25.5483 14.4915 25.1136 14.7443C24.679 14.9943 24.1847 15.1193 23.6307 15.1193ZM30.9315 15.1193C30.4315 15.1193 29.9812 15.0199 29.5806 14.821C29.18 14.6222 28.859 14.3494 28.6175 14.0028C28.3761 13.6562 28.244 13.2614 28.2212 12.8182H29.244C29.2837 13.2131 29.4627 13.5398 29.7809 13.7983C30.1019 14.054 30.4854 14.1818 30.9315 14.1818C31.2894 14.1818 31.6076 14.098 31.886 13.9304C32.1673 13.7628 32.3874 13.5327 32.5465 13.2401C32.7085 12.9446 32.7894 12.6108 32.7894 12.2386C32.7894 11.858 32.7056 11.5185 32.538 11.2202C32.3732 10.919 32.146 10.6818 31.8562 10.5085C31.5664 10.3352 31.2354 10.2472 30.8633 10.2443C30.5962 10.2415 30.3221 10.2827 30.0408 10.3679C29.7596 10.4503 29.5281 10.5568 29.3462 10.6875L28.3576 10.5682L28.886 6.27273H33.4201V7.21023H29.7724L29.4656 9.78409H29.5167C29.6957 9.64205 29.9201 9.52415 30.19 9.4304C30.4599 9.33665 30.7411 9.28977 31.0337 9.28977C31.5678 9.28977 32.0437 9.41761 32.4613 9.6733C32.8817 9.92614 33.2113 10.2727 33.4499 10.7131C33.6914 11.1534 33.8121 11.6562 33.8121 12.2216C33.8121 12.7784 33.6871 13.2756 33.4371 13.7131C33.19 14.1477 32.8491 14.4915 32.4144 14.7443C31.9798 14.9943 31.4854 15.1193 30.9315 15.1193ZM35.522 15V8.45455H36.4936V9.47727H36.5788C36.7152 9.12784 36.9354 8.85653 37.2393 8.66335C37.5433 8.46733 37.9084 8.36932 38.3345 8.36932C38.7663 8.36932 39.1257 8.46733 39.4126 8.66335C39.7024 8.85653 39.9283 9.12784 40.0902 9.47727H40.1584C40.326 9.1392 40.5774 8.87074 40.9126 8.67188C41.2479 8.47017 41.6499 8.36932 42.1186 8.36932C42.7038 8.36932 43.1825 8.55256 43.5547 8.91903C43.9268 9.28267 44.1129 9.84943 44.1129 10.6193V15H43.1072V10.6193C43.1072 10.1364 42.9751 9.79119 42.7109 9.58381C42.4467 9.37642 42.1357 9.27273 41.7777 9.27273C41.3175 9.27273 40.9609 9.41193 40.7081 9.69034C40.4553 9.96591 40.3288 10.3153 40.3288 10.7386V15H39.3061V10.517C39.3061 10.1449 39.1854 9.84517 38.9439 9.6179C38.7024 9.38778 38.3913 9.27273 38.0107 9.27273C37.7493 9.27273 37.505 9.34233 37.2777 9.48153C37.0533 9.62074 36.8714 9.81392 36.7322 10.0611C36.5959 10.3054 36.5277 10.5881 36.5277 10.9091V15H35.522Z" fill="#0F172A" />
              <path d="M10.25 4.25H12.75" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.5 11.75L13.375 9.875" stroke="black" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.5 16.75C14.2614 16.75 16.5 14.5114 16.5 11.75C16.5 8.98858 14.2614 6.75 11.5 6.75C8.73858 6.75 6.5 8.98858 6.5 11.75C6.5 14.5114 8.73858 16.75 11.5 16.75Z" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-2">
              <button type="submit" className="btn-segundary">Editar</button>
              <button type="submit" className="btn-delete">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </>

  );
}
