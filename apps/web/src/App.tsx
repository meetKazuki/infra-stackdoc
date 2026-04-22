import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import React from 'react'
import { EditorPage } from './pages/EditorPage'
import { SharedView } from './pages/SharedView'

const EditorWithState: React.FC = () => {
  const location = useLocation()
  const state = location.state as { yaml?: string } | null
  return <EditorPage initialYaml={state?.yaml} />
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorWithState />} />
        <Route path="/s/:slug" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  )
}
