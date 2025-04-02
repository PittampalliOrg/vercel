import type React from "react"
import "react-toastify/dist/ReactToastify.css"
import "../../../app/globals.css"
import { ToastContainerWrapper } from "../components/ToastContainer"

export default function MCPLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <ToastContainerWrapper />
    </>
  )
}

