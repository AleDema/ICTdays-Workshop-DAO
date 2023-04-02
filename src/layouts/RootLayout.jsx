import React from 'react'
import AuthButton from "../components/AuthButton"
import { ConnectDialog } from "@connect2ic/react"
import { Outlet } from "react-router-dom";

function RootLayout() {
  return (
    <>
      <div className="p-6 absolute">
        <AuthButton />
      </div>
      <div className=" bg-bg-primary text-gray-50 antialiased font-sans space-y-4 h-screen w-screen flex items-center justify-center flex-col color">
        <ConnectDialog dark={true} />
        <Outlet />
      </div>
    </>
  )
}

export default RootLayout