"use client"

import { useState } from "react"
import { Icon } from "./icon"

/** Contraseña con botón para verla: en el celular es fácil equivocarse al escribirla. */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false)
  return (
    <span className="pass">
      <input {...props} type={shown ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button type="button" className="pass-eye" onClick={() => setShown(!shown)} aria-label={shown ? "Ocultar contraseña" : "Ver contraseña"} aria-pressed={shown}>
        <Icon name={shown ? "eyeOff" : "eye"} />
      </button>
    </span>
  )
}
