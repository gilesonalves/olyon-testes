import { NextResponse } from "next/server"

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiError = {
  ok: false
  error: string
}

export function ok<T>(data: T) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status: 200 })
}

export function created<T>(data: T) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status: 201 })
}

export function badRequest(error: string) {
  return NextResponse.json<ApiError>({ ok: false, error }, { status: 400 })
}

export function unauthorized(error = "Não autenticado") {
  return NextResponse.json<ApiError>({ ok: false, error }, { status: 401 })
}

export function notFound(error = "Não encontrado") {
  return NextResponse.json<ApiError>({ ok: false, error }, { status: 404 })
}

export function serverError(error = "Erro interno do servidor") {
  return NextResponse.json<ApiError>({ ok: false, error }, { status: 500 })
}