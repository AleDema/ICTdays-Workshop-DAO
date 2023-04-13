import React from 'react'
import { Outlet } from "react-router-dom";

function RootLayout() {
  return (
    <>
      <div className="bg-gray-900 w-screen h-screen flex flex-col overflow-auto ">
        <Outlet></Outlet>
      </div>
    </>
  )
}

export default RootLayout